package main

import (
	"database/sql"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"strings"
	"sync"
	"time"
)

// smsCodes 内存版短信验证码存储（开发期；生产应替换为 Redis 等持久化 + 真实短信网关）。
var smsCodes = struct {
	sync.Mutex
	m map[string]smsRecord
}{m: make(map[string]smsRecord)}

type smsRecord struct {
	code string
	exp  int64 // 过期时间点（Unix 毫秒）
}

const smsTTLMs = 5 * 60 * 1000 // 5 分钟有效

// genCode 生成 6 位短信验证码。
func genCode() string {
	return fmt.Sprintf("%06d", rand.Intn(1000000))
}

// handleRegister 注册新用户（默认 role='user'），注册成功直接签发 token 自动登录。
// 密码在数据库内用 pgcrypto 的 crypt() 生成 bcrypt 哈希，Go 侧无需 bcrypt 库。
func (app *App) handleRegister(w http.ResponseWriter, r *http.Request) {
	body, err := decodeBody(r)
	if err != nil {
		fail(w, 400, "请求体格式错误")
		return
	}
	phone, _ := body["phone"].(string)
	password, _ := body["password"].(string)
	nickname, _ := body["nickname"].(string)

	if !phoneRE.MatchString(phone) {
		fail(w, 400, "请输入合法的手机号")
		return
	}
	if len(password) < 6 {
		fail(w, 400, "密码至少 6 位")
		return
	}

	// 手机号全局唯一，注册前查重
	var existID int64
	err = app.db.QueryRow("SELECT id FROM users WHERE phone = $1", phone).Scan(&existID)
	if err != nil && err != sql.ErrNoRows {
		fail(w, 500, "数据库错误")
		return
	}
	if err == nil {
		fail(w, 409, "该手机号已注册")
		return
	}

	name := trimSpace(nickname)
	if name == "" {
		name = phone
	}

	var u User
	err = app.db.QueryRow(
		`INSERT INTO users (phone, nickname, password, role)
		 VALUES ($1, $2, crypt($3, gen_salt('bf')), 'user')
		 RETURNING id, nickname, phone, role`,
		phone, name, password,
	).Scan(&u.ID, &u.Nickname, &u.Phone, &u.Role)
	if err != nil {
		fail(w, 500, "注册失败: "+err.Error())
		return
	}
	token := signToken(u.ID, u.Role)
	created(w, map[string]interface{}{"token": token, "user": u}, "注册成功")
}

// handleSmsSend 发送短信验证码（前端当前默认关闭，仅保留实现以备启用）。
func (app *App) handleSmsSend(w http.ResponseWriter, r *http.Request) {
	body, err := decodeBody(r)
	if err != nil {
		fail(w, 400, "请求体格式错误")
		return
	}
	phone, _ := body["phone"].(string)
	if !phoneRE.MatchString(phone) {
		fail(w, 400, "请输入合法的手机号")
		return
	}
	code := genCode()
	smsCodes.Lock()
	smsCodes.m[phone] = smsRecord{code: code, exp: time.Now().UnixMilli() + smsTTLMs}
	smsCodes.Unlock()
	// 开发环境把验证码打印到控制台，方便联调（生产环境应替换为真实短信发送）
	log.Printf("[sms] 向 %s 发送验证码：%s（开发环境打印，未真实发送）", phone, code)
	ok(w, map[string]interface{}{}, "ok")
}

// handleLogin 登录：支持密码路径（当前启用）与短信验证码路径（备用）。
func (app *App) handleLogin(w http.ResponseWriter, r *http.Request) {
	body, err := decodeBody(r)
	if err != nil {
		fail(w, 400, "请求体格式错误")
		return
	}
	phone, _ := body["phone"].(string)
	code, _ := body["code"].(string)
	password, _ := body["password"].(string)

	if !phoneRE.MatchString(phone) {
		fail(w, 400, "请输入合法的手机号")
		return
	}

	// 路径一：密码登录（当前启用），crypt() 在数据库内完成 bcrypt 比对
	if password != "" {
		var u User
		err := app.db.QueryRow(
			`SELECT id, nickname, phone, role FROM users
			 WHERE phone = $1 AND password = crypt($2, password)`,
			phone, password,
		).Scan(&u.ID, &u.Nickname, &u.Phone, &u.Role)
		if err == sql.ErrNoRows {
			fail(w, 401, "手机号或密码错误")
			return
		}
		if err != nil {
			fail(w, 500, "数据库错误")
			return
		}
		token := signToken(u.ID, u.Role)
		ok(w, map[string]interface{}{"token": token, "user": u}, "ok")
		return
	}

	// 路径二：短信验证码登录（备用）
	if code != "" {
		smsCodes.Lock()
		rec, found := smsCodes.m[phone]
		smsCodes.Unlock()
		if !found || rec.exp < time.Now().UnixMilli() {
			fail(w, 400, "验证码已过期，请重新获取")
			return
		}
		if rec.code != code {
			fail(w, 400, "验证码错误")
			return
		}
		smsCodes.Lock()
		delete(smsCodes.m, phone)
		smsCodes.Unlock()

		var u User
		err := app.db.QueryRow("SELECT id, nickname, phone, role FROM users WHERE phone = $1", phone).
			Scan(&u.ID, &u.Nickname, &u.Phone, &u.Role)
		if err == sql.ErrNoRows {
			fail(w, 401, "该手机号尚未注册")
			return
		}
		if err != nil {
			fail(w, 500, "数据库错误")
			return
		}
		token := signToken(u.ID, u.Role)
		ok(w, map[string]interface{}{"token": token, "user": u}, "ok")
		return
	}

	fail(w, 400, "请提供密码或短信验证码")
}

// handleMe 用 token 换取当前登录用户。
func (app *App) handleMe(w http.ResponseWriter, r *http.Request) {
	p := requireAuth(w, r)
	if p == nil {
		return
	}
	var u User
	err := app.db.QueryRow("SELECT id, nickname, phone, role FROM users WHERE id = $1", p.UID).
		Scan(&u.ID, &u.Nickname, &u.Phone, &u.Role)
	if err == sql.ErrNoRows {
		fail(w, 401, "用户不存在或登录已失效")
		return
	}
	if err != nil {
		fail(w, 500, "数据库错误")
		return
	}
	ok(w, u, "ok")
}

// trimSpace 简单去空格（避免引入 strings 仅为这一处）。
func trimSpace(s string) string {
	return strings.TrimSpace(s)
}

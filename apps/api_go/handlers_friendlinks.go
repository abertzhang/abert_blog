package main

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"strings"
)

// handleFriendLinksList 友链列表（前台通常再按 enabled 过滤）。
func (app *App) handleFriendLinksList(w http.ResponseWriter, r *http.Request) {
	rows, err := app.db.Query(`SELECT id, name, url, "desc", enabled, sort FROM friend_links ORDER BY sort ASC, id ASC`)
	if err != nil {
		fail(w, 500, "数据库错误")
		return
	}
	defer rows.Close()
	links, err := scanFriendLinks(rows)
	if err != nil {
		fail(w, 500, "数据库错误")
		return
	}
	ok(w, links, "ok")
}

func scanFriendLinks(rows *sql.Rows) ([]FriendLink, error) {
	var out []FriendLink
	for rows.Next() {
		var f FriendLink
		var desc sql.NullString
		var enabled sql.NullBool
		if err := rows.Scan(&f.ID, &f.Name, &f.URL, &desc, &enabled, &f.Sort); err != nil {
			return nil, err
		}
		f.Desc = desc.String
		f.Enabled = enabled.Bool
		out = append(out, f)
	}
	return out, rows.Err()
}

// handleFriendLinkCreate 新建友链（管理员）。
func (app *App) handleFriendLinkCreate(w http.ResponseWriter, r *http.Request) {
	p := requireAuth(w, r)
	if p == nil {
		return
	}
	if !requireAdmin(p, w) {
		return
	}
	body, err := decodeBody(r)
	if err != nil {
		fail(w, 400, "请求体格式错误")
		return
	}
	name, _ := body["name"].(string)
	url, _ := body["url"].(string)
	name = strings.TrimSpace(name)
	url = strings.TrimSpace(url)
	if name == "" {
		fail(w, 400, "友链名称 name 不能为空")
		return
	}
	if url == "" {
		fail(w, 400, "友链地址 url 不能为空")
		return
	}
	desc, _ := body["desc"].(string)
	enabled := true
	if v, ok := body["enabled"]; ok && v != nil {
		enabled = toBool(v)
	}
	var sort int
	if v, ok := body["sort"]; ok && v != nil {
		if i, ok2 := toInt64(v); ok2 {
			sort = int(i)
		}
	}

	var f FriendLink
	var d sql.NullString
	var e sql.NullBool
	err = app.db.QueryRow(
		`INSERT INTO friend_links (name, url, "desc", enabled, sort)
		 VALUES ($1, $2, $3, COALESCE($4, true), COALESCE($5, 0))
		 RETURNING id, name, url, "desc", enabled, sort`,
		name, url, desc, enabled, sort,
	).Scan(&f.ID, &f.Name, &f.URL, &d, &e, &f.Sort)
	if err != nil {
		fail(w, 500, "创建失败: "+err.Error())
		return
	}
	f.Desc = d.String
	f.Enabled = e.Bool
	created(w, f, "创建成功")
}

// handleFriendLinkUpdate 更新友链（管理员）。
func (app *App) handleFriendLinkUpdate(w http.ResponseWriter, r *http.Request) {
	p := requireAuth(w, r)
	if p == nil {
		return
	}
	if !requireAdmin(p, w) {
		return
	}
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		fail(w, 400, "非法的友链 id")
		return
	}
	body, err := decodeBody(r)
	if err != nil {
		fail(w, 400, "请求体格式错误")
		return
	}
	sets := []string{}
	params := []interface{}{}
	pi := 0
	set := func(col string, val interface{}) {
		pi++
		sets = append(sets, fmt.Sprintf("%s = $%d", col, pi))
		params = append(params, val)
	}
	if v, ok := body["name"]; ok && v != nil {
		set("name", toStr(v))
	}
	if v, ok := body["url"]; ok && v != nil {
		set("url", toStr(v))
	}
	if v, ok := body["desc"]; ok && v != nil {
		set("desc", toStr(v))
	}
	if v, ok := body["enabled"]; ok && v != nil {
		set("enabled", toBool(v))
	}
	if v, ok := body["sort"]; ok && v != nil {
		if i, ok2 := toInt64(v); ok2 {
			set("sort", i)
		}
	}
	if len(sets) == 0 {
		fail(w, 400, "没有任何可更新的字段")
		return
	}
	params = append(params, id)
	var f FriendLink
	var d sql.NullString
	var e sql.NullBool
	err = app.db.QueryRow(
		`UPDATE friend_links SET `+strings.Join(sets, ", ")+` WHERE id = $`+fmt.Sprint(pi+1)+`
		 RETURNING id, name, url, "desc", enabled, sort`,
		params...,
	).Scan(&f.ID, &f.Name, &f.URL, &d, &e, &f.Sort)
	if err == sql.ErrNoRows {
		fail(w, 404, "友链不存在")
		return
	}
	if err != nil {
		fail(w, 500, "更新失败: "+err.Error())
		return
	}
	f.Desc = d.String
	f.Enabled = e.Bool
	ok(w, f, "ok")
}

// handleFriendLinkDelete 删除友链（管理员）。
func (app *App) handleFriendLinkDelete(w http.ResponseWriter, r *http.Request) {
	p := requireAuth(w, r)
	if p == nil {
		return
	}
	if !requireAdmin(p, w) {
		return
	}
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		fail(w, 400, "非法的友链 id")
		return
	}
	res, err := app.db.Exec("DELETE FROM friend_links WHERE id = $1", id)
	if err != nil {
		fail(w, 500, "删除失败")
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		fail(w, 404, "友链不存在")
		return
	}
	ok(w, map[string]interface{}{}, "ok")
}

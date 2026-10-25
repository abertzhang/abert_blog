package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"strings"
	"time"
)

// TokenPayload 与 api_express utils/token.js 完全一致的结构。
// 使用 base64url（无填充）编码，HMAC-SHA256 签名，因此两端令牌可互验。
type TokenPayload struct {
	UID  int64  `json:"uid"`
	Role string `json:"role"`
	Exp  int64  `json:"exp"`
}

var jwtSecret []byte

// initToken 设置签名密钥（应来自环境变量 JWT_SECRET，与 api_express 保持一致）。
func initToken(secret string) {
	jwtSecret = []byte(secret)
}

const defaultTTLSeconds = 7 * 24 * 60 * 60 // 7 天

// signToken 签发令牌（base64url(payload) + '.' + base64url(HMAC)）。
func signToken(uid int64, role string) string {
	payload := TokenPayload{UID: uid, Role: role, Exp: time.Now().Unix() + defaultTTLSeconds}
	raw, _ := json.Marshal(payload)
	body := base64.RawURLEncoding.EncodeToString(raw)
	mac := hmac.New(sha256.New, jwtSecret)
	mac.Write([]byte(body))
	sig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	return body + "." + sig
}

// verifyToken 校验令牌；有效返回载荷，否则返回 nil。
func verifyToken(token string) *TokenPayload {
	if token == "" {
		return nil
	}
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return nil
	}
	body, sig := parts[0], parts[1]

	mac := hmac.New(sha256.New, jwtSecret)
	mac.Write([]byte(body))
	expected := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(sig), []byte(expected)) {
		return nil
	}

	raw, err := base64.RawURLEncoding.DecodeString(body)
	if err != nil {
		return nil
	}
	var p TokenPayload
	if err := json.Unmarshal(raw, &p); err != nil {
		return nil
	}
	if p.Exp < time.Now().Unix() {
		return nil
	}
	if p.UID == 0 {
		return nil
	}
	return &p
}

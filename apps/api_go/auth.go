package main

import (
	"net/http"
	"strings"
)

// extractToken 从 Authorization: Bearer <token> 中抽出令牌。
func extractToken(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if strings.HasPrefix(h, "Bearer ") {
		return strings.TrimSpace(h[len("Bearer "):])
	}
	return ""
}

// requireAuth 校验登录态；失败直接写 401 并返回 nil。
func requireAuth(w http.ResponseWriter, r *http.Request) *TokenPayload {
	p := verifyToken(extractToken(r))
	if p == nil {
		fail(w, 401, "未登录或登录已失效")
		return nil
	}
	return p
}

// requireAdmin 校验管理员权限；非管理员写 403 并返回 false。
func requireAdmin(p *TokenPayload, w http.ResponseWriter) bool {
	if p == nil {
		return false
	}
	if p.Role != "admin" {
		fail(w, 403, "需要管理员权限")
		return false
	}
	return true
}

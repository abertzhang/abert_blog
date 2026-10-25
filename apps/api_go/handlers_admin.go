package main

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
)

// handleAdminArticles 后台文章列表（管理视图，含草稿，不翻页直接返回全量）。
func (app *App) handleAdminArticles(w http.ResponseWriter, r *http.Request) {
	p := requireAuth(w, r)
	if p == nil {
		return
	}
	if !requireAdmin(p, w) {
		return
	}
	rows, err := app.db.Query(fmt.Sprintf("SELECT %s %s ORDER BY a.created_at DESC, a.id DESC", listCols, fromJoin))
	if err != nil {
		fail(w, 500, "数据库错误")
		return
	}
	defer rows.Close()
	list, err := scanArticles(rows)
	if err != nil {
		fail(w, 500, "数据库错误")
		return
	}
	ok(w, list, "ok")
}

// handleAdminArticleDetail 后台文章详情（编辑用，含正文，不增加浏览量）。
func (app *App) handleAdminArticleDetail(w http.ResponseWriter, r *http.Request) {
	p := requireAuth(w, r)
	if p == nil {
		return
	}
	if !requireAdmin(p, w) {
		return
	}
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		fail(w, 400, "非法的文章 id")
		return
	}
	row := app.db.QueryRow(fmt.Sprintf("SELECT %s %s WHERE a.id = $1", detailCols, fromJoin), id)
	a, err := scanArticleRow(row.Scan, true)
	if err == sql.ErrNoRows {
		fail(w, 404, "文章不存在")
		return
	}
	if err != nil {
		fail(w, 500, "数据库错误")
		return
	}
	ok(w, a, "ok")
}

// handleAdminFriendLinks 后台友链列表（含未启用）。
func (app *App) handleAdminFriendLinks(w http.ResponseWriter, r *http.Request) {
	p := requireAuth(w, r)
	if p == nil {
		return
	}
	if !requireAdmin(p, w) {
		return
	}
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

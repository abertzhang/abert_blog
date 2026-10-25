package main

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"strings"
)

// handleArticlesList 文章分页列表（仅已发布），支持 category_id 与 tag 过滤。
func (app *App) handleArticlesList(w http.ResponseWriter, r *http.Request) {
	page := max(1, parseIntDefault(r.URL.Query().Get("page"), 1))
	pageSize := parseIntDefault(r.URL.Query().Get("page_size"), 12)
	if pageSize > 100 {
		pageSize = 100
	}
	if pageSize < 1 {
		pageSize = 1
	}
	categoryIDStr := r.URL.Query().Get("category_id")
	tag := strings.TrimSpace(r.URL.Query().Get("tag"))

	where := []string{"a.status = $1"}
	params := []interface{}{"published"}
	pi := 2
	if categoryIDStr != "" {
		if cid, err := strconv.ParseInt(categoryIDStr, 10, 64); err == nil {
			where = append(where, fmt.Sprintf("a.category_id = $%d", pi))
			params = append(params, cid)
			pi++
		}
	}
	if tag != "" {
		where = append(where, fmt.Sprintf("a.tags ILIKE $%d", pi))
		params = append(params, "%"+tag+"%")
		pi++
	}
	whereSql := "WHERE " + strings.Join(where, " AND ")

	var total int
	if err := app.db.QueryRow("SELECT COUNT(*) AS total "+fromJoin+" "+whereSql, params...).Scan(&total); err != nil {
		fail(w, 500, "数据库错误")
		return
	}

	dataParams := make([]interface{}, len(params))
	copy(dataParams, params)
	dataParams = append(dataParams, pageSize, (page-1)*pageSize)
	rows, err := app.db.Query(fmt.Sprintf(
		"SELECT %s %s %s %s LIMIT $%d OFFSET $%d",
		listCols, fromJoin, whereSql, orderBy, pi, pi+1), dataParams...)
	if err != nil {
		fail(w, 500, "数据库错误")
		return
	}
	defer rows.Close()

	list := []Article{}
	for rows.Next() {
		a, err := scanArticleRow(rows.Scan, false)
		if err != nil {
			fail(w, 500, "数据库错误")
			return
		}
		list = append(list, a)
	}
	if err := rows.Err(); err != nil {
		fail(w, 500, "数据库错误")
		return
	}

	ok(w, map[string]interface{}{
		"list":      list,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	}, "ok")
}

// handleArticleDetail 文章详情（含正文），并自增浏览量。
func (app *App) handleArticleDetail(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		fail(w, 400, "非法的文章 id")
		return
	}
	// 先自增浏览量（不存在时影响 0 行）
	if _, err := app.db.Exec("UPDATE articles SET view_count = view_count + 1 WHERE id = $1", id); err != nil {
		fail(w, 500, "数据库错误")
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

// handleArticleCreate 新建文章（管理员），动态拼装列与绑定参数。
func (app *App) handleArticleCreate(w http.ResponseWriter, r *http.Request) {
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
	title, _ := body["title"].(string)
	title = strings.TrimSpace(title)
	if title == "" {
		fail(w, 400, "标题 title 不能为空")
		return
	}

	var authorName string
	_ = app.db.QueryRow("SELECT nickname FROM users WHERE id = $1", p.UID).Scan(&authorName)

	cols := []string{"title", "author_id", "author_name"}
	segs := []string{"$1", "$2", "$3"}
	params := []interface{}{title, p.UID, authorName}
	pi := 3
	add := func(col string, val interface{}) {
		pi++
		cols = append(cols, col)
		segs = append(segs, fmt.Sprintf("$%d", pi))
		params = append(params, val)
	}
	addRaw := func(col, expr string) {
		cols = append(cols, col)
		segs = append(segs, expr)
	}

	if v, ok := body["summary"]; ok && v != nil {
		add("summary", toStr(v))
	}
	if v, ok := body["content"]; ok && v != nil {
		add("content", toStr(v))
	}
	if v, ok := body["cover"]; ok && v != nil {
		add("cover", toStr(v))
	}
	if v, ok := body["category_id"]; ok && v != nil {
		if cid, ok2 := toInt64(v); ok2 {
			add("category_id", cid)
		}
	}
	if v, ok := body["tags"]; ok && v != nil {
		add("tags", toStr(v))
	}
	if v, ok := body["copyright"]; ok && v != nil {
		add("copyright", toBool(v))
	}
	if v, ok := body["pinned"]; ok && v != nil {
		add("pinned", toBool(v))
	}

	status := "published"
	if s, ok := body["status"].(string); ok && s == "draft" {
		status = "draft"
	}
	add("status", status)

	if status == "published" {
		if pa, ok := body["published_at"]; ok && pa != nil {
			if t, ok2 := toTime(pa); ok2 {
				add("published_at", t)
			} else {
				addRaw("published_at", "now()")
			}
		} else {
			addRaw("published_at", "now()")
		}
	} else if pa, ok := body["published_at"]; ok && pa != nil {
		if t, ok2 := toTime(pa); ok2 {
			add("published_at", t)
		}
	}

	var newID int64
	err = app.db.QueryRow(
		fmt.Sprintf("INSERT INTO articles (%s) VALUES (%s) RETURNING id",
			strings.Join(cols, ", "), strings.Join(segs, ", ")),
		params...,
	).Scan(&newID)
	if err != nil {
		fail(w, 500, "创建失败: "+err.Error())
		return
	}

	row := app.db.QueryRow(fmt.Sprintf("SELECT %s %s WHERE a.id = $1", detailCols, fromJoin), newID)
	a, err := scanArticleRow(row.Scan, true)
	if err != nil {
		fail(w, 500, "数据库错误")
		return
	}
	created(w, a, "创建成功")
}

// handleArticleUpdate 更新文章（管理员）。
func (app *App) handleArticleUpdate(w http.ResponseWriter, r *http.Request) {
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
	if v, ok := body["title"]; ok && v != nil {
		set("title", toStr(v))
	}
	if v, ok := body["summary"]; ok && v != nil {
		set("summary", toStr(v))
	}
	if v, ok := body["content"]; ok && v != nil {
		set("content", toStr(v))
	}
	if v, ok := body["cover"]; ok && v != nil {
		set("cover", toStr(v))
	}
	if v, ok := body["category_id"]; ok {
		if v == nil {
			set("category_id", nil)
		} else if cid, ok2 := toInt64(v); ok2 {
			set("category_id", cid)
		} else {
			set("category_id", nil)
		}
	}
	if v, ok := body["tags"]; ok && v != nil {
		set("tags", toStr(v))
	}
	if v, ok := body["copyright"]; ok && v != nil {
		set("copyright", toBool(v))
	}
	if v, ok := body["pinned"]; ok && v != nil {
		set("pinned", toBool(v))
	}
	if v, ok := body["status"]; ok && v != nil {
		s := toStr(v)
		if s == "draft" {
			set("status", "draft")
		} else {
			set("status", "published")
		}
	}
	if v, ok := body["published_at"]; ok {
		if v == nil {
			set("published_at", nil)
		} else if t, ok2 := toTime(v); ok2 {
			set("published_at", t)
		}
	}
	if len(sets) == 0 {
		fail(w, 400, "没有任何可更新的字段")
		return
	}
	params = append(params, id)
	res, err := app.db.Exec(fmt.Sprintf("UPDATE articles SET %s WHERE id = $%d",
		strings.Join(sets, ", "), pi+1), params...)
	if err != nil {
		fail(w, 500, "更新失败: "+err.Error())
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		fail(w, 404, "文章不存在")
		return
	}
	row := app.db.QueryRow(fmt.Sprintf("SELECT %s %s WHERE a.id = $1", detailCols, fromJoin), id)
	a, err := scanArticleRow(row.Scan, true)
	if err != nil {
		fail(w, 500, "数据库错误")
		return
	}
	ok(w, a, "ok")
}

// handleArticleDelete 删除文章（管理员）。
func (app *App) handleArticleDelete(w http.ResponseWriter, r *http.Request) {
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
	res, err := app.db.Exec("DELETE FROM articles WHERE id = $1", id)
	if err != nil {
		fail(w, 500, "删除失败")
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		fail(w, 404, "文章不存在")
		return
	}
	ok(w, map[string]interface{}{}, "ok")
}

// handleCommentsList 某文章评论列表（按时间升序）。
func (app *App) handleCommentsList(w http.ResponseWriter, r *http.Request) {
	articleID, err := strconv.ParseInt(r.PathValue("articleId"), 10, 64)
	if err != nil {
		fail(w, 400, "非法的文章 id")
		return
	}
	rows, err := app.db.Query(
		`SELECT id, article_id, parent_id, nickname, content, is_author, created_at
		   FROM comments WHERE article_id = $1 ORDER BY created_at ASC, id ASC`, articleID)
	if err != nil {
		fail(w, 500, "数据库错误")
		return
	}
	defer rows.Close()
	list := []Comment{}
	for rows.Next() {
		var c Comment
		var parentID sql.NullInt64
		var createdAt sql.NullTime
		if err := rows.Scan(&c.ID, &c.ArticleID, &parentID, &c.Nickname, &c.Content, &c.IsAuthor, &createdAt); err != nil {
			fail(w, 500, "数据库错误")
			return
		}
		if parentID.Valid {
			c.ParentID = &parentID.Int64
		}
		if createdAt.Valid {
			c.CreatedAt = &createdAt.Time
		}
		list = append(list, c)
	}
	if err := rows.Err(); err != nil {
		fail(w, 500, "数据库错误")
		return
	}
	ok(w, list, "ok")
}

// handleCommentCreate 发表评论（需登录）；作者名 / is_author 由后端按登录态注入。
func (app *App) handleCommentCreate(w http.ResponseWriter, r *http.Request) {
	p := requireAuth(w, r)
	if p == nil {
		return
	}
	articleID, err := strconv.ParseInt(r.PathValue("articleId"), 10, 64)
	if err != nil {
		fail(w, 400, "非法的文章 id")
		return
	}
	body, err := decodeBody(r)
	if err != nil {
		fail(w, 400, "请求体格式错误")
		return
	}
	content, _ := body["content"].(string)
	content = strings.TrimSpace(content)
	if content == "" {
		fail(w, 400, "评论内容不能为空")
		return
	}
	var nickname string
	_ = app.db.QueryRow("SELECT nickname FROM users WHERE id = $1", p.UID).Scan(&nickname)
	if nickname == "" {
		nickname = "匿名用户"
	}

	var authorID sql.NullInt64
	_ = app.db.QueryRow("SELECT author_id FROM articles WHERE id = $1", articleID).Scan(&authorID)
	isAuthor := p.Role == "admin" || (authorID.Valid && authorID.Int64 == p.UID)

	var parentID interface{}
	if v, ok := body["parent_id"]; ok && v != nil {
		if pid, ok2 := toInt64(v); ok2 {
			parentID = pid
		}
	}

	var c Comment
	err = app.db.QueryRow(
		`INSERT INTO comments (article_id, parent_id, nickname, content, is_author)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, article_id, parent_id, nickname, content, is_author, created_at`,
		articleID, parentID, nickname, content, isAuthor,
	).Scan(&c.ID, &c.ArticleID, &c.ParentID, &c.Nickname, &c.Content, &c.IsAuthor, &c.CreatedAt)
	if err != nil {
		fail(w, 500, "评论失败: "+err.Error())
		return
	}
	created(w, c, "评论成功")
}

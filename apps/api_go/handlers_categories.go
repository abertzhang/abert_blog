package main

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/lib/pq"
)

// handleCategoriesList 分类列表（含每个分类的已发布文章数）。
func (app *App) handleCategoriesList(w http.ResponseWriter, r *http.Request) {
	rows, err := app.db.Query(
		`SELECT c.id, c.name, c.slug, c.sort,
		        COUNT(a.id) FILTER (WHERE a.status = 'published') AS article_count
		   FROM categories c
		   LEFT JOIN articles a ON a.category_id = c.id
		  GROUP BY c.id, c.name, c.slug, c.sort
		  ORDER BY c.sort ASC, c.id ASC`)
	if err != nil {
		fail(w, 500, "数据库错误")
		return
	}
	defer rows.Close()
	cats, err := scanCategories(rows)
	if err != nil {
		fail(w, 500, "数据库错误")
		return
	}
	ok(w, cats, "ok")
}

func scanCategories(rows *sql.Rows) ([]Category, error) {
	var out []Category
	for rows.Next() {
		var c Category
		if err := rows.Scan(&c.ID, &c.Name, &c.Slug, &c.Sort, &c.ArticleCount); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// handleCategoryCreate 新建分类（管理员）。
func (app *App) handleCategoryCreate(w http.ResponseWriter, r *http.Request) {
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
	name = strings.TrimSpace(name)
	if name == "" {
		fail(w, 400, "分类名称 name 不能为空")
		return
	}
	slug, _ := body["slug"].(string)
	var sort int
	if v, ok := body["sort"]; ok && v != nil {
		if i, ok2 := toInt64(v); ok2 {
			sort = int(i)
		}
	}

	var c Category
	err = app.db.QueryRow(
		`INSERT INTO categories (name, slug, sort)
		 VALUES ($1, $2, COALESCE($3, 0))
		 RETURNING id, name, slug, sort, 0 AS article_count`,
		name, strings.TrimSpace(slug), sort,
	).Scan(&c.ID, &c.Name, &c.Slug, &c.Sort, &c.ArticleCount)
	if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
		fail(w, 409, "该分类 slug 或名称已存在")
		return
	}
	if err != nil {
		fail(w, 500, "创建失败: "+err.Error())
		return
	}
	created(w, c, "创建成功")
}

// handleCategoryUpdate 更新分类（管理员）。
func (app *App) handleCategoryUpdate(w http.ResponseWriter, r *http.Request) {
	p := requireAuth(w, r)
	if p == nil {
		return
	}
	if !requireAdmin(p, w) {
		return
	}
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		fail(w, 400, "非法的分类 id")
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
	if v, ok := body["slug"]; ok && v != nil {
		set("slug", toStr(v))
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
	var c Category
	err = app.db.QueryRow(
		`UPDATE categories SET `+strings.Join(sets, ", ")+`
		 WHERE id = $`+fmt.Sprint(pi+1)+`
		 RETURNING id, name, slug, sort,
		   (SELECT COUNT(*) FROM articles a WHERE a.category_id = categories.id AND a.status='published') AS article_count`,
		params...,
	).Scan(&c.ID, &c.Name, &c.Slug, &c.Sort, &c.ArticleCount)
	if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
		fail(w, 409, "该分类 slug 或名称已存在")
		return
	}
	if err == sql.ErrNoRows {
		fail(w, 404, "分类不存在")
		return
	}
	if err != nil {
		fail(w, 500, "更新失败: "+err.Error())
		return
	}
	ok(w, c, "ok")
}

// handleCategoryDelete 删除分类（管理员）；文章外键 ON DELETE SET NULL，删除后文章保留。
func (app *App) handleCategoryDelete(w http.ResponseWriter, r *http.Request) {
	p := requireAuth(w, r)
	if p == nil {
		return
	}
	if !requireAdmin(p, w) {
		return
	}
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		fail(w, 400, "非法的分类 id")
		return
	}
	res, err := app.db.Exec("DELETE FROM categories WHERE id = $1", id)
	if err != nil {
		fail(w, 500, "删除失败")
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		fail(w, 404, "分类不存在")
		return
	}
	ok(w, map[string]interface{}{}, "ok")
}

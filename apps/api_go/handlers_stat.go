package main

import (
	"database/sql"
	"fmt"
	"net/http"
	"sort"
	"strings"
)

// TagCount 标签云词频项。
type TagCount struct {
	Word  string `json:"word"`
	Count int    `json:"count"`
}

// handleHot 热门文章（按浏览量降序），query: limit（默认 20，最大 100）。
func (app *App) handleHot(w http.ResponseWriter, r *http.Request) {
	limit := parseIntDefault(r.URL.Query().Get("limit"), 20)
	if limit > 100 {
		limit = 100
	}
	if limit < 1 {
		limit = 1
	}
	rows, err := app.db.Query(fmt.Sprintf(
		"SELECT %s %s WHERE a.status = 'published' ORDER BY a.view_count DESC, COALESCE(a.published_at, a.created_at) DESC LIMIT $1",
		listCols, fromJoin), limit)
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

// scanArticles 扫描文章列表（不含 content）。
func scanArticles(rows *sql.Rows) ([]Article, error) {
	out := []Article{}
	for rows.Next() {
		a, err := scanArticleRow(rows.Scan, false)
		if err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

// handleWordcloud 标签云词频，query: limit。
func (app *App) handleWordcloud(w http.ResponseWriter, r *http.Request) {
	var limit *int
	if s := r.URL.Query().Get("limit"); s != "" {
		v := parseIntDefault(s, 0)
		if v > 0 {
			limit = &v
		}
	}
	data, err := app.aggregateTags(limit)
	if err != nil {
		fail(w, 500, "数据库错误")
		return
	}
	ok(w, data, "ok")
}

// handleTags 标签列表（与 wordcloud 同源，作为兜底）。
func (app *App) handleTags(w http.ResponseWriter, r *http.Request) {
	data, err := app.aggregateTags(nil)
	if err != nil {
		fail(w, 500, "数据库错误")
		return
	}
	ok(w, data, "ok")
}

// aggregateTags 聚合文章 tags 字段（逗号 / 中文逗号分隔）为词频，按 count 降序、word 升序。
func (app *App) aggregateTags(limit *int) ([]TagCount, error) {
	rows, err := app.db.Query("SELECT tags FROM articles WHERE status = 'published' AND tags IS NOT NULL AND tags <> ''")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	counts := map[string]int{}
	for rows.Next() {
		var tags string
		if err := rows.Scan(&tags); err != nil {
			return nil, err
		}
		for _, part := range strings.Split(strings.ReplaceAll(tags, "，", ","), ",") {
			p := strings.TrimSpace(part)
			if p == "" {
				continue
			}
			counts[p]++
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	arr := make([]TagCount, 0, len(counts))
	for word, count := range counts {
		arr = append(arr, TagCount{Word: word, Count: count})
	}
	sort.Slice(arr, func(i, j int) bool {
		if arr[i].Count != arr[j].Count {
			return arr[i].Count > arr[j].Count
		}
		return arr[i].Word < arr[j].Word
	})
	if limit != nil && *limit > 0 && len(arr) > *limit {
		arr = arr[:*limit]
	}
	return arr, nil
}

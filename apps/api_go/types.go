package main

import (
	"database/sql"
	"time"
)

// 与前端 src/types/blog.ts 字段一一对应的返回结构（JSON 键沿用 api_express 的 snake_case 口径）。

// Article 文章（列表不含 content，详情含 content；content 为指针以便按需省略）。
type Article struct {
	ID           int64      `json:"id"`
	Title        string     `json:"title"`
	Summary      string     `json:"summary"`
	Cover        string     `json:"cover"`
	CategoryID   *int64     `json:"category_id"`
	CategoryName string     `json:"category_name"`
	Tags         string     `json:"tags"`
	AuthorName   string     `json:"author_name"`
	Copyright    bool       `json:"copyright"`
	Status       string     `json:"status"`
	Pinned       bool       `json:"pinned"`
	ViewCount    int        `json:"view_count"`
	PublishedAt  *time.Time `json:"published_at"`
	CreatedAt    *time.Time `json:"created_at"`
	Content      *string    `json:"content,omitempty"`
}

// Category 分类（含已发布文章数）。
type Category struct {
	ID           int64  `json:"id"`
	Name         string `json:"name"`
	Slug         string `json:"slug"`
	Sort         int    `json:"sort"`
	ArticleCount int    `json:"article_count"`
}

// Comment 评论（支持楼中楼）。
type Comment struct {
	ID        int64      `json:"id"`
	ArticleID int64      `json:"article_id"`
	ParentID  *int64     `json:"parent_id"`
	Nickname  string     `json:"nickname"`
	Content   string     `json:"content"`
	IsAuthor  bool       `json:"is_author"`
	CreatedAt *time.Time `json:"created_at"`
}

// FriendLink 友情链接。
type FriendLink struct {
	ID     int64  `json:"id"`
	Name   string `json:"name"`
	URL    string `json:"url"`
	Desc   string `json:"desc"`
	Enabled bool  `json:"enabled"`
	Sort   int    `json:"sort"`
}

// User 对外暴露的用户对象（与前端 User 类型一致）。
type User struct {
	ID       int64  `json:"id"`
	Nickname string `json:"nickname"`
	Phone    string `json:"phone"`
	Role     string `json:"role"`
}

// BannerSlide 首页轮播封面。
type BannerSlide struct {
	Image    string `json:"image"`
	Category string `json:"category"`
}

// ---------- 与 api_express 完全一致的 SELECT 片段 ----------

const listCols = `a.id, a.title, a.summary, a.cover, a.category_id, a.author_name, a.tags,
  a.copyright, a.status, a.pinned, a.view_count, a.published_at, a.created_at,
  c.name AS category_name`
const detailCols = listCols + `, a.content`
const fromJoin  = `FROM articles a LEFT JOIN categories c ON c.id = a.category_id`
const orderBy   = `ORDER BY a.pinned DESC, COALESCE(a.published_at, a.created_at) DESC, a.id DESC`

// scanArticleRow 将一行扫描为 Article。withContent=true 时最后一列是 a.content。
func scanArticleRow(scan func(...interface{}) error, withContent bool) (Article, error) {
	var a Article
	var categoryID sql.NullInt64
	var summary, cover, categoryName, tags, authorName, status, content sql.NullString
	var publishedAt, createdAt sql.NullTime
	var copyright, pinned bool
	var viewCount int

	dest := []interface{}{
		&a.ID, &a.Title, &summary, &cover, &categoryID, &authorName, &tags,
		&copyright, &status, &pinned, &viewCount, &publishedAt, &createdAt, &categoryName,
	}
	if withContent {
		dest = append(dest, &content)
	}
	if err := scan(dest...); err != nil {
		return a, err
	}

	a.Summary = summary.String
	a.Cover = cover.String
	a.CategoryName = categoryName.String
	a.Tags = tags.String
	a.AuthorName = authorName.String
	a.Status = status.String
	a.Copyright = copyright
	a.Pinned = pinned
	a.ViewCount = viewCount
	if categoryID.Valid {
		a.CategoryID = &categoryID.Int64
	}
	if publishedAt.Valid {
		a.PublishedAt = &publishedAt.Time
	}
	if createdAt.Valid {
		a.CreatedAt = &createdAt.Time
	}
	if withContent && content.Valid {
		s := content.String
		a.Content = &s
	}
	return a, nil
}

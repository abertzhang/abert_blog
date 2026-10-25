package main

import (
	"database/sql"
	"log"
	"net/http"
	"strings"
)

// App 持有共享依赖（数据库连接与配置）。
type App struct {
	db  *sql.DB
	cfg Config
}

func main() {
	cfg := loadConfig()
	initToken(cfg.JWTSecret)

	db, err := openDB(cfg)
	if err != nil {
		log.Fatalf("数据库连接失败: %v", err)
	}
	defer db.Close()

	app := &App{db: db, cfg: cfg}
	mux := app.routes()

	addr := ":" + cfg.Port
	log.Printf("api_go 已启动，监听 %s（接口前缀 /blog/api，连接 PostgreSQL :%d/blog）", addr, cfg.PGPORT)
	if err := http.ListenAndServe(addr, app.handler(mux)); err != nil {
		log.Fatalf("服务启动失败: %v", err)
	}
}

// handler 顶层处理器：注入 CORS、处理根路径健康检查、其余请求交给路由表；
// 根路径与 CORS 不走 mux，以规避 Go ServeMux 的「/blog/api/{path...} 与 GET / 冲突」限制。
func (app *App) handler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 根路径健康检查
		if r.URL.Path == "/" {
			app.health(w, r)
			return
		}
		// /blog/api 下的请求注入 CORS 头，并直接响应预检 OPTIONS
		if strings.HasPrefix(r.URL.Path, "/blog/api") {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type,Authorization")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

// routes 注册全部接口到 http.ServeMux（Go 1.22+ 支持方法前缀与 {id} 路径变量）。
func (app *App) routes() *http.ServeMux {
	mux := http.NewServeMux()

	// ---- 认证 ----
	mux.HandleFunc("POST /blog/api/auth/register", app.handleRegister)
	mux.HandleFunc("POST /blog/api/auth/sms/send", app.handleSmsSend)
	mux.HandleFunc("POST /blog/api/auth/login", app.handleLogin)
	mux.HandleFunc("GET /blog/api/auth/me", app.handleMe)

	// ---- 分类 ----
	mux.HandleFunc("GET /blog/api/categories", app.handleCategoriesList)
	mux.HandleFunc("POST /blog/api/categories", app.handleCategoryCreate)
	mux.HandleFunc("PUT /blog/api/categories/{id}", app.handleCategoryUpdate)
	mux.HandleFunc("DELETE /blog/api/categories/{id}", app.handleCategoryDelete)

	// ---- 文章 + 评论 ----
	mux.HandleFunc("GET /blog/api/articles", app.handleArticlesList)
	mux.HandleFunc("POST /blog/api/articles", app.handleArticleCreate)
	mux.HandleFunc("GET /blog/api/articles/{id}", app.handleArticleDetail)
	mux.HandleFunc("PUT /blog/api/articles/{id}", app.handleArticleUpdate)
	mux.HandleFunc("DELETE /blog/api/articles/{id}", app.handleArticleDelete)
	mux.HandleFunc("GET /blog/api/articles/{articleId}/comments", app.handleCommentsList)
	mux.HandleFunc("POST /blog/api/articles/{articleId}/comments", app.handleCommentCreate)

	// ---- 友情链接 ----
	mux.HandleFunc("GET /blog/api/friend-links", app.handleFriendLinksList)
	mux.HandleFunc("POST /blog/api/friend-links", app.handleFriendLinkCreate)
	mux.HandleFunc("PUT /blog/api/friend-links/{id}", app.handleFriendLinkUpdate)
	mux.HandleFunc("DELETE /blog/api/friend-links/{id}", app.handleFriendLinkDelete)

	// ---- 热度 / 标签云 ----
	mux.HandleFunc("GET /blog/api/hot", app.handleHot)
	mux.HandleFunc("GET /blog/api/wordcloud", app.handleWordcloud)
	mux.HandleFunc("GET /blog/api/tags", app.handleTags)

	// ---- 首页 banner（公共图床随机封面，无需数据库）----
	mux.HandleFunc("GET /blog/api/banners", app.handleBanners)

	// ---- 后台管理 ----
	mux.HandleFunc("GET /blog/api/admin/articles", app.handleAdminArticles)
	mux.HandleFunc("GET /blog/api/admin/articles/{id}", app.handleAdminArticleDetail)
	mux.HandleFunc("GET /blog/api/admin/friend-links", app.handleAdminFriendLinks)

	// ---- /blog/api 下未匹配接口 -> 404 信封 ----
	mux.HandleFunc("GET /blog/api", app.handleApiNotFound)
	mux.HandleFunc("/blog/api/{path...}", app.handleApiNotFound)

	return mux
}

// health 根路径健康检查。
func (app *App) health(w http.ResponseWriter, r *http.Request) {
	ok(w, map[string]string{"service": "blog-api", "status": "ok"}, "ok")
}

// handleApiNotFound 覆盖 /blog/api 下所有未注册路径，返回统一 404 信封。
func (app *App) handleApiNotFound(w http.ResponseWriter, r *http.Request) {
	fail(w, 404, "接口不存在: "+r.Method+" "+r.URL.Path)
}

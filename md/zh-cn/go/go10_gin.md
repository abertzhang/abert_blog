---
title: Gin 框架学习文档（Go Web 开发）
create:2026-10-21
update:2026-10-21
category:golang
cover:https://img-common.aknot.uk/cover/land-02.jpg
tags:[go,golang,gin,web,framework,backend,rest,api]
summary:Gin 是目前 Go 生态最流行的轻量级 Web 框架。本文从安装、路由、请求/响应、中间件、数据绑定与校验、模板渲染、文件上传、Cookie/Session、JWT、CORS、优雅关闭、GORM 集成、单元测试到 gin.Context 全量 API 速查，覆盖 Gin 几乎全部常用接口，每个接口均配可直接运行的示例代码。
keywords:[gin,golang,go,web框架,路由,中间件,数据绑定,jwt,cors,gorm,单元测试]
top:1
copyright:true
---

# Gin 框架学习文档（Go Web 开发）

> Gin 是一个用 Go（Golang）编写的高性能 HTTP Web 框架，基于 `net/http` 封装，使用 `httprouter` 风格的 Radix 树路由，内存占用小、路由速度快。
> 本文面向已经掌握 Go 基础语法的开发者，目标是**把 Gin 的常用接口讲全、讲透**，每个小节都配可直接 `go run` 的示例。
> 示例代码基于 **Gin v1.9.x / v1.10.x**（要求 Go ≥ 1.20），API 在两个版本间基本兼容。

---

## 目录

1. [简介与核心特性](#1-简介与核心特性)
2. [安装与第一个 Gin 程序](#2-安装与第一个-gin-程序)
3. [运行模式（Debug / Release / Test）](#3-运行模式debug--release--test)
4. [路由（Router）](#4-路由router)
5. [获取请求数据](#5-获取请求数据)
6. [返回响应](#6-返回响应)
7. [中间件（Middleware）](#7-中间件middleware)
8. [数据绑定与校验](#8-数据绑定与校验)
9. [HTML 模板渲染](#9-html-模板渲染)
10. [静态文件服务](#10-静态文件服务)
11. [文件上传与下载](#11-文件上传与下载)
12. [Cookie 与 Session](#12-cookie-与-session)
13. [JWT 认证（中间件实战）](#13-jwt-认证中间件实战)
14. [CORS 跨域处理](#14-cors-跨域处理)
15. [自定义 404 / 405 与 Panic 恢复](#15-自定义-404--405-与-panic-恢复)
16. [优雅关闭（Graceful Shutdown）](#16-优雅关闭graceful-shutdown)
17. [与 GORM 集成（数据库）](#17-与-gorm-集成数据库)
18. [单元测试（httptest）](#18-单元测试httptest)
19. [推荐项目结构](#19-推荐项目结构)
20. [gin.Context 全量 API 速查表](#20-gincontext-全量-api-速查表)
21. [常见问题与排错](#21-常见问题与排错)

---

## 1. 简介与核心特性

Gin 的核心卖点：

- **极快**：基于 Radix 树路由，基准测试中性能接近原生 `net/http`。
- **中间件机制**：HTTP 请求生命周期内可挂载任意数量中间件，支持全局、分组、单路由三级。
- **Crash 自动恢复**：内置 `Recovery` 中间件，panic 不会让进程退出。
- **JSON 校验与绑定**：一行代码把请求体绑定到结构体并做校验。
- **路由分组**：方便做 API 版本化、统一前缀、统一中间件。
- **内置渲染**：JSON / XML / YAML / HTML / 纯文本 / 文件，开箱即用。

典型适用场景：RESTful API、微服务、BFF（Backend For Frontend）、后台管理接口。

---

## 2. 安装与第一个 Gin 程序

### 2.1 初始化模块并安装

```bash
# 1. 初始化 go module（如果还没有）
mkdir gin-demo && cd gin-demo
go mod init gin-demo

# 2. 安装 gin（最新稳定版）
go get -u github.com/gin-gonic/gin
```

> 国内拉取 GitHub 慢时，可临时设置代理：
> ```bash
> go env -w GOPROXY=https://goproxy.cn,direct
> ```

### 2.2 最小可运行示例

```go
// main.go
package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func main() {
	// gin.Default() = gin.New() + Logger() + Recovery()
	r := gin.Default()

	// 注册一个 GET 路由
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "pong",
		})
	})

	// 默认监听 :8080，等价于 http.ListenAndServe(":8080", r)
	r.Run()
}
```

运行：

```bash
go run main.go
# 另开终端访问
curl http://localhost:8080/ping
# {"message":"pong"}
```

> `gin.H` 是 `map[string]interface{}` 的类型别名，用来快速构造 JSON 对象，等价于 `map[string]any{...}`。

---

## 3. 运行模式（Debug / Release / Test）

Gin 有三种运行模式，通过环境变量 `GIN_MODE` 或代码设置：

| 模式 | 值 | 行为 |
| --- | --- | --- |
| Debug | `debug` | 默认；打印路由表、详细的请求日志，性能略低 |
| Release | `release` | 关闭调试输出，生产环境应使用 |
| Test | `test` | 关闭日志颜色与部分输出，便于测试 |

```go
package main

import "github.com/gin-gonic/gin"

func main() {
	// 方式一：代码设置（必须在 gin.Default()/New() 之前）
	gin.SetMode(gin.ReleaseMode)
	// gin.SetMode(gin.DebugMode)
	// gin.SetMode(gin.TestMode)

	// 方式二：环境变量（优先级更高）
	// export GIN_MODE=release

	r := gin.Default()
	r.GET("/", func(c *gin.Context) {
		c.String(200, "hello")
	})
	r.Run()
}
```

其他环境相关开关：

```go
// 关闭控制台颜色输出（日志写入文件时有用）
gin.DisableConsoleColor()

// 强制开启颜色（某些终端默认关闭时）
gin.ForceConsoleColor()

// 自定义日志/错误输出目标（默认是 os.Stdout / os.Stderr）
// gin.DefaultWriter = os.Stdout
// gin.DefaultErrorWriter = os.Stderr
// 也可重定向到文件：
// f, _ := os.Create("gin.log")
// gin.DefaultWriter = io.MultiWriter(f, os.Stdout)
```

---

## 4. 路由（Router）

### 4.1 基本 HTTP 方法

Gin 支持所有标准方法：**GET / POST / PUT / DELETE / PATCH / HEAD / OPTIONS**。

```go
r := gin.Default()

r.GET("/users", func(c *gin.Context) { c.String(200, "GET users") })
r.POST("/users", func(c *gin.Context) { c.String(200, "POST users") })
r.PUT("/users/:id", func(c *gin.Context) { c.String(200, "PUT users") })
r.DELETE("/users/:id", func(c *gin.Context) { c.String(200, "DELETE users") })
r.PATCH("/users/:id", func(c *gin.Context) { c.String(200, "PATCH users") })
r.HEAD("/health", func(c *gin.Context) { c.Status(200) })
r.OPTIONS("/users", func(c *gin.Context) { c.Status(204) })

// Any：匹配以上所有方法
r.Any("/ping", func(c *gin.Context) {
	c.String(200, "any method")
})

// Handle：手动指定方法字符串
r.Handle("GET", "/handle", func(c *gin.Context) {
	c.String(200, "handled")
})
```

### 4.2 路径参数（Path Parameters）

使用 `:name` 声明单段参数，使用 `*filepath` 声明贪婪匹配的多段参数。

```go
// :name 匹配单段（不含 /）
r.GET("/users/:id", func(c *gin.Context) {
	id := c.Param("id") // 取路径参数
	c.String(200, "user id = %s", id)
})

// *action 匹配剩余全部路径，包含 /
r.GET("/files/*filepath", func(c *gin.Context) {
	fp := c.Param("filepath") // 例如 /images/a/b.png
	c.String(200, "filepath = %s", fp)
})
```

访问示例：

```
GET /users/42        -> id = "42"
GET /files/img/a.png -> filepath = "/img/a.png"
```

> ⚠️ 路由冲突规则：`/user/:id` 与 `/user/name` 不冲突（前者是参数，后者是字面量，字面量优先）；但 `/user/:id` 与 `/user/:name` 冲突（同名参数段）。

### 4.3 查询参数（Query String）

```go
r.GET("/search", func(c *gin.Context) {
	// 必填：没有则返回 ""
	q := c.Query("q")

	// 带默认值：没有该参数时使用默认值
	page := c.DefaultQuery("page", "1")
	size := c.DefaultQuery("size", "10")

	c.JSON(200, gin.H{
		"q":    q,
		"page": page,
		"size": size,
	})
})
```

访问：`/search?q=gin&page=2` → `{"q":"gin","page":"2","size":"10"}`

### 4.4 路由分组（Route Group）

分组可以共享前缀和中间件，是组织 API 的关键手段。

```go
r := gin.Default()

// 顶层分组：/api/v1
v1 := r.Group("/api/v1")
{
	// /api/v1/users
	v1.GET("/users", listUsers)
	// /api/v1/users/:id
	v1.GET("/users/:id", getUser)

	// 嵌套分组：/api/v1/admin，并附加 Auth 中间件
	admin := v1.Group("/admin")
	admin.Use(AuthRequired()) // 仅该分组生效
	{
		admin.POST("/flush", flushCache)
	}
}
```

### 4.5 通配与 404 / 405

```go
// 无任何路由匹配时触发（404）
r.NoRoute(func(c *gin.Context) {
	c.JSON(404, gin.H{"code": 404, "msg": "页面不存在"})
})

// 路由存在但方法不匹配时触发（405）
r.NoMethod(func(c *gin.Context) {
	c.JSON(405, gin.H{"code": 405, "msg": "方法不被允许"})
})
```

---

## 5. 获取请求数据

### 5.1 路径参数与查询参数

见 [4.2](#42-路径参数path-parameters) 与 [4.3](#43-查询参数query-string)。补充批量/映射型查询：

```go
r.GET("/multi", func(c *gin.Context) {
	// 同名多值：?tag=a&tag=b
	tags := c.QueryArray("tag")      // []string{"a","b"}
	// 映射形式：?user[name]=tom&user[age]=18
	user := c.QueryMap("user")       // map[string]string{"name":"tom","age":"18"}
	c.JSON(200, gin.H{"tags": tags, "user": user})
})
```

### 5.2 表单与 x-www-form-urlencoded

```go
r.POST("/login", func(c *gin.Context) {
	// 表单字段（POST 表单 / query 均可）
	user := c.PostForm("username")
	// 带默认值
	pwd := c.DefaultPostForm("password", "")

	// 同名多值
	roles := c.PostFormArray("role")
	// 映射形式
	info := c.PostFormMap("info")

	c.JSON(200, gin.H{
		"username": user,
		"password": pwd,
		"roles":    roles,
		"info":     info,
	})
})
```

### 5.3 原始 Body（Raw Body）

```go
r.POST("/raw", func(c *gin.Context) {
	data, err := c.GetRawData() // 返回 []byte
	if err != nil {
		c.String(400, "read body failed: %v", err)
		return
	}
	c.String(200, "body length = %d", len(data))
})
```

### 5.4 请求头（Header）

```go
r.GET("/header", func(c *gin.Context) {
	token := c.GetHeader("Authorization") // 等价于 c.Request.Header.Get
	ua := c.Request.UserAgent()
	ip := c.ClientIP() // 获取客户端真实 IP（尊重 X-Forwarded-For 等）
	c.JSON(200, gin.H{"token": token, "ua": ua, "ip": ip})
})
```

### 5.5 设置与读取上下文键值（跨中间件传值）

```go
r.GET("/ctx", func(c *gin.Context) {
	c.Set("user", "alice")       // 写入
	c.Set("score", 100)
	c.Next()                     // 这里会执行后续（无）中间件
})

// 在另一个处理函数或中间件里读取：
func readCtx(c *gin.Context) {
	user, _ := c.Get("user")           // 返回 interface{}
	name := c.GetString("user")        // 直接取 string
	score := c.GetInt("score")         // 直接取 int
	_ = user
	_ = name
	_ = score
}
```

> 类型安全的取值方法：`GetString` / `GetBool` / `GetInt` / `GetInt64` / `GetFloat64` / `GetTime` / `GetDuration` / `GetStringSlice` / `GetStringMap` / `GetStringMapString` / `MustGet`（取不到直接 panic）。

---

## 6. 返回响应

### 6.1 返回 JSON

```go
r.GET("/json", func(c *gin.Context) {
	// 方式一：gin.H 快捷构造
	c.JSON(200, gin.H{"code": 0, "data": "ok"})

	// 方式二：结构体（推荐，便于约束字段）
	type User struct {
		ID   int    `json:"id"`
		Name string `json:"name"`
	}
	c.JSON(200, User{ID: 1, Name: "Tom"})

	// 方式三：带缩进的漂亮 JSON（调试用）
	c.IndentedJSON(200, User{ID: 1, Name: "Tom"})
})
```

### 6.2 返回纯文本 / XML / YAML

```go
r.GET("/text", func(c *gin.Context) {
	// 纯文本，支持格式化
	c.String(200, "hello %s, you are %d", "Tom", 18)
})

r.GET("/xml", func(c *gin.Context) {
	type Root struct {
		XMLName xml.Name `xml:"root"`
		Value   string   `xml:"value"`
	}
	c.XML(200, Root{Value: "gin"})
})

r.GET("/yaml", func(c *gin.Context) {
	c.YAML(200, gin.H{"name": "gin", "version": "1.9"})
})
```

> XML 示例需 `import "encoding/xml"`；YAML 由 Gin 内置支持，无需额外依赖。

### 6.3 返回 HTML（模板）

```go
r.LoadHTMLGlob("templates/*")
r.GET("/", func(c *gin.Context) {
	// 渲染 templates/index.html，并传入数据
	c.HTML(200, "index.html", gin.H{
		"title": "Gin 首页",
		"list":  []string{"a", "b", "c"},
	})
})
```

对应 `templates/index.html` 见 [第 9 节](#9-html-模板渲染)。

### 6.4 返回二进制 / 文件下载

```go
r.GET("/data", func(c *gin.Context) {
	// 直接返回字节流，并指定 Content-Type
	c.Data(200, "application/octet-stream", []byte("binary content"))
})

// 直接把服务器上的文件发给客户端（自动设置 Content-Type）
r.GET("/download", func(c *gin.Context) {
	c.File("./static/report.pdf")
})

// 指定下载文件名（Content-Disposition: attachment）
r.GET("/download2", func(c *gin.Context) {
	c.FileAttachment("./static/report.pdf", "报告.pdf")
})
```

### 6.5 重定向与状态码

```go
r.GET("/to-baidu", func(c *gin.Context) {
	c.Redirect(302, "https://www.baidu.com")
})

r.GET("/to-internal", func(c *gin.Context) {
	c.Redirect(301, "/hello") // 内部路由重定向
})

r.GET("/hello", func(c *gin.Context) {
	c.String(200, "hello")
})

r.GET("/status", func(c *gin.Context) {
	c.Status(201) // 只写状态码，不写 body
})
```

### 6.6 设置响应头

```go
r.GET("/resp-header", func(c *gin.Context) {
	c.Header("X-Custom", "gin-demo")     // 设置响应头
	c.SetCookie("sid", "abc", 3600, "/", "localhost", false, true)
	c.String(200, "ok")
})
```

---

## 7. 中间件（Middleware）

中间件本质是 `func(*gin.Context)`，通过 `c.Next()` 控制执行流。Gin 的中间件栈是**先进后出（洋葱模型）**。

### 7.1 内置中间件

```go
r := gin.New()                 // 纯净引擎，不含任何中间件
r.Use(gin.Logger())            // 请求日志
r.Use(gin.Recovery())          // panic 恢复
```

`gin.Default()` 等价于 `gin.New()` + 上面两个 `Use`。

### 7.2 自定义中间件（全局）

```go
// 计算请求耗时的全局中间件
func CostTime() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next() // 执行后续的处理函数与剩余中间件
		cost := time.Since(start)
		c.Header("X-Cost-Time", cost.String())
	}
}

func main() {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery(), CostTime())
	r.GET("/", func(c *gin.Context) {
		c.String(200, "ok")
	})
	r.Run()
}
```

### 7.3 中间件分级挂载

```go
r := gin.Default()

// 1. 全局中间件：所有路由生效
r.Use(GlobalMW())

// 2. 分组中间件：仅该组生效
api := r.Group("/api")
api.Use(AuthMW()) // 仅 /api 下生效
{
	api.GET("/me", meHandler)
}

// 3. 单路由中间件：仅这一个路由生效
r.GET("/special", SpecialMW(), specialHandler)
```

### 7.4 中断请求（Abort）

```go
func AuthMW() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.GetHeader("Authorization")
		if token == "" {
			// 中断后续处理，直接返回
			c.AbortWithStatusJSON(401, gin.H{"msg": "未登录"})
			return
		}
		c.Set("token", token)
		c.Next()
	}
}
```

相关方法：
- `c.Abort()`：停止调用后续处理函数（但当前中间件剩余代码仍执行）。
- `c.AbortWithStatus(code)`：中断并返回状态码。
- `c.AbortWithStatusJSON(code, obj)`：中断并返回 JSON。
- `c.AbortWithError(code, err)`：中断并记录错误，返回 JSON。
- `c.IsAborted()`：判断是否已经中断。

> ⚠️ `c.Next()` 之后若继续执行到 `c.Abort()` 是无效的（后续链已执行完）。通常 abort 后 `return`。

### 7.5 BasicAuth 中间件

Gin 内置 HTTP Basic 认证：

```go
r := gin.Default()
// 账号：admin / 密码：secret
authorized := r.Group("/admin", gin.BasicAuth(gin.Accounts{
	"admin": "secret",
}))
authorized.GET("/dashboard", func(c *gin.Context) {
	user := c.MustGet(gin.AuthUserKey).(string)
	c.String(200, "欢迎, %s", user)
})
```

### 7.6 自定义 Panic 恢复

```go
r := gin.New()
r.Use(gin.CustomRecovery(func(c *gin.Context, err interface{}) {
	c.JSON(500, gin.H{"msg": "服务器内部错误", "detail": err})
}))
```

### 7.7 在 goroutine 中使用 Context

中间件/处理函数中启动 goroutine 时，必须调用 `c.Copy()`，因为原始 `c` 在请求结束后会被复用。

```go
r.GET("/async", func(c *gin.Context) {
	// 错误：直接用 c 进 goroutine
	// go func() { c.String(...) }()

	// 正确：复制一份
	cp := c.Copy()
	go func() {
		// 用 cp 做耗时操作，如写日志、发消息
		_ = cp.Request.URL.Path
	}()
	c.String(200, "accepted")
})
```

---

## 8. 数据绑定与校验

Gin 使用 [`go-playground/validator/v10`](https://github.com/go-playground/validator) 做结构体校验。

### 8.1 绑定 JSON / 表单 / Query

```go
type LoginReq struct {
	Username string `json:"username" binding:"required"`          // 必填
	Password string `json:"password" binding:"required,min=6"`    // 必填且至少 6 位
	Age      int    `json:"age" binding:"gte=0,lte=150"`          // 0~150
	Email    string `json:"email" binding:"required,email"`       // 必须是邮箱
}

r.POST("/login", func(c *gin.Context) {
	var req LoginReq
	// ShouldBindJSON：仅解析 Content-Type: application/json
	// 校验失败返回 error，但 不 写响应
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"msg": "参数错误", "err": err.Error()})
		return
	}
	c.JSON(200, gin.H{"username": req.Username})
})
```

常用绑定方法对比：

| 方法 | 行为 | 失败是否写响应 |
| --- | --- | --- |
| `ShouldBindJSON` | 仅绑 JSON | 否（返回 error） |
| `BindJSON` | 仅绑 JSON | 是（直接 400） |
| `ShouldBind` / `Bind` | 按 Content-Type 自动选（JSON/表单/Query） | 否 / 是 |
| `ShouldBindQuery` | 仅绑 URL 查询参数 | 否 |
| `ShouldBindUri` | 仅绑路径参数 | 否 |
| `ShouldBindHeader` | 仅绑请求头 | 否 |

> 推荐用 `ShouldBind*` 系列，自己控制错误响应，体验更可控。

### 8.2 绑定路径参数与查询参数

```go
type UriReq struct {
	ID uint `uri:"id" binding:"required"`
}
type QueryReq struct {
	Page int `form:"page" binding:"required"`
}

r.GET("/users/:id", func(c *gin.Context) {
	var uri UriReq
	if err := c.ShouldBindUri(&uri); err != nil {
		c.JSON(400, gin.H{"msg": err.Error()})
		return
	}

	var q QueryReq
	if err := c.ShouldBindQuery(&q); err != nil {
		c.JSON(400, gin.H{"msg": err.Error()})
		return
	}
	c.JSON(200, gin.H{"id": uri.ID, "page": q.Page})
})
```

### 8.3 常用校验标签

| 标签 | 含义 |
| --- | --- |
| `required` | 不能为零值（空字符串、0、nil） |
| `min=n` / `max=n` | 字符串最小/最大长度，数字最小/最大值 |
| `len=n` | 长度/值等于 n |
| `email` | 邮箱格式 |
| `gte=n` / `lte=n` | 大于等于 / 小于等于 |
| `gt` / `lt` | 大于 / 小于 |
| `oneof=a b c` | 必须是枚举之一 |
| `numeric` | 数字字符串 |
| `uuid` | UUID 格式 |
| `url` | URL 格式 |
| `datetime=2006-01-02` | 指定格式时间 |
| `omitempty` | 字段为空时跳过校验（配合其他标签） |

示例：

```go
type Article struct {
	Title  string `form:"title" binding:"required,min=2,max=50"`
	Status string `form:"status" binding:"oneof=draft published"`
	CateID uint   `form:"cate_id" binding:"required"`
}
```

### 8.4 自定义校验规则

```go
import (
	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"
)

// 校验 booking 日期不能是过去
func bookableDate(fl validator.FieldLevel) bool {
	date, ok := fl.Field().Interface().(string)
	if !ok {
		return false
	}
	t, err := time.Parse("2006-01-02", date)
	if err != nil {
		return false
	}
	return t.After(time.Now())
}

func main() {
	r := gin.Default()

	// 拿到 Gin 内部的 validator 引擎并注册自定义规则
	if v, ok := binding.Validator.Engine().(*validator.Validate); ok {
		v.RegisterValidation("bookable_date", bookableDate)
	}

	type Booking struct {
		CheckIn string `form:"check_in" binding:"required,bookable_date"`
	}
	r.POST("/book", func(c *gin.Context) {
		var b Booking
		if err := c.ShouldBind(&b); err != nil {
			c.JSON(400, gin.H{"msg": err.Error()})
			return
		}
		c.JSON(200, b)
	})
	r.Run()
}
```

### 8.5 重复读取 Body

默认 `ShouldBindJSON` 会消费请求体，无法二次读取。需要多次解析时使用 `ShouldBindBodyWith`：

```go
func DoubleRead() gin.HandlerFunc {
	return func(c *gin.Context) {
		var a map[string]interface{}
		_ = c.ShouldBindBodyWith(&a, binding.JSON) // 缓存后可读多次
		var b map[string]interface{}
		_ = c.ShouldBindBodyWith(&b, binding.JSON)
		c.Next()
	}
}
```

---

## 9. HTML 模板渲染

### 9.1 加载模板并渲染

目录结构：

```
project/
├── main.go
└── templates/
    ├── index.html
    └── layouts/
        └── base.html
```

```go
func main() {
	r := gin.Default()
	// 加载单层
	r.LoadHTMLGlob("templates/*")
	// 或加载多层（含子目录）
	// r.LoadHTMLGlob("templates/**/*")

	r.GET("/", func(c *gin.Context) {
		c.HTML(200, "index.html", gin.H{
			"title": "首页",
			"users": []string{"Tom", "Jerry"},
		})
	})
	r.Run()
}
```

`templates/index.html`（使用标准 `html/template` 语法）：

```html
<!DOCTYPE html>
<html>
<head><title>{{ .title }}</title></head>
<body>
  <h1>{{ .title }}</h1>
  <ul>
    {{ range .users }}
      <li>{{ . }}</li>
    {{ end }}
  </ul>
</body>
</html>
```

### 9.2 自定义模板函数

```go
import "html/template"

func main() {
	r := gin.Default()

	// 注册自定义函数（必须在 LoadHTMLGlob 之前）
	r.SetFuncMap(template.FuncMap{
		"safe": func(s string) template.HTML {
			return template.HTML(s) // 标记为安全 HTML，不被转义
		},
	})
	r.LoadHTMLGlob("templates/*")

	r.GET("/", func(c *gin.Context) {
		c.HTML(200, "index.html", gin.H{
			"raw": "<b>加粗</b>",
		})
	})
	r.Run()
}
```

模板中即可使用 `{{ .raw | safe }}`。

---

## 10. 静态文件服务

```go
func main() {
	r := gin.Default()

	// 把 /static 映射到本地 ./static 目录
	r.Static("/static", "./static")

	// 单个文件，例如 favicon
	r.StaticFile("/favicon.ico", "./static/favicon.ico")

	// 使用自定义的 http.FileSystem（如 embed 打包的文件系统）
	// r.StaticFS("/assets", http.Dir("./assets"))

	r.Run()
}
```

访问 `http://localhost:8080/static/style.css` 即可读取 `./static/style.css`。

---

## 11. 文件上传与下载

### 11.1 单文件上传

```html
<!-- upload.html -->
<form action="/upload" method="post" enctype="multipart/form-data">
  <input type="file" name="file" />
  <button type="submit">上传</button>
</form>
```

```go
r.POST("/upload", func(c *gin.Context) {
	// file 是 multipart.FileHeader
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(400, gin.H{"msg": err.Error()})
		return
	}
	// 保存到本地
	dst := "./uploads/" + file.Filename
	if err := c.SaveUploadedFile(file, dst); err != nil {
		c.JSON(500, gin.H{"msg": err.Error()})
		return
	}
	c.JSON(200, gin.H{
		"filename": file.Filename,
		"size":     file.Size,
	})
})
```

### 11.2 多文件上传

```go
// 方式一：按字段名取多个
r.POST("/upload-multi", func(c *gin.Context) {
	form, _ := c.MultipartForm()
	files := form.File["files"] // 同名多文件
	for _, f := range files {
		_ = c.SaveUploadedFile(f, "./uploads/"+f.Filename)
	}
	c.JSON(200, gin.H{"count": len(files)})
})

// 方式二：逐个取
r.POST("/upload-many", func(c *gin.Context) {
	// 取第一个
	f1, _ := c.FormFile("f1")
	f2, _ := c.FormFile("f2")
	_ = c.SaveUploadedFile(f1, "./uploads/"+f1.Filename)
	_ = c.SaveUploadedFile(f2, "./uploads/"+f2.Filename)
	c.String(200, "ok")
})
```

### 11.3 限制上传大小

```go
func main() {
	r := gin.Default()
	// 限制整个请求体（含文件）最大 8MB（默认 32MB）
	r.MaxMultipartMemory = 8 << 20
	r.POST("/upload", uploadHandler)
	r.Run()
}
```

---

## 12. Cookie 与 Session

### 12.1 Cookie

```go
r.GET("/set-cookie", func(c *gin.Context) {
	// SetCookie(name, value, maxAge秒, path, domain, secure, httpOnly)
	c.SetCookie("session_id", "abc123", 3600, "/", "localhost", false, true)
	c.String(200, "cookie set")
})

r.GET("/get-cookie", func(c *gin.Context) {
	v, err := c.Cookie("session_id")
	if err != nil {
		c.String(200, "no cookie")
		return
	}
	c.String(200, "cookie = %s", v)
})
```

### 12.2 Session（基于 gin-contrib/sessions）

Gin 官方不内置 Session，使用社区中间件：

```bash
go get github.com/gin-contrib/sessions
go get github.com/gin-contrib/sessions/cookie
```

```go
import (
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()

	// 用 cookie 存储 session，secret 用于加密签名
	store := cookie.NewStore([]byte("secret-key"))
	r.Use(sessions.Sessions("mysession", store))

	r.GET("/login", func(c *gin.Context) {
		session := sessions.Default(c)
		session.Set("user", "alice")
		_ = session.Save() // 必须调用 Save 才能写入
		c.String(200, "logged in")
	})

	r.GET("/profile", func(c *gin.Context) {
		session := sessions.Default(c)
		user := session.Get("user")
		if user == nil {
			c.String(401, "未登录")
			return
		}
		c.String(200, "user = %v", user)
	})

	r.GET("/logout", func(c *gin.Context) {
		session := sessions.Default(c)
		session.Delete("user")
		_ = session.Save()
		c.String(200, "logged out")
	})

	r.Run()
}
```

---

## 13. JWT 认证（中间件实战）

JWT 是无状态认证的常用方案。示例基于 `github.com/golang-jwt/jwt/v5`。

```bash
go get github.com/golang-jwt/jwt/v5
```

```go
package main

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

var jwtSecret = []byte("your-256-bit-secret")

// 生成 token
func genToken(username string) (string, error) {
	claims := jwt.MapClaims{
		"username": username,
		"exp":      time.Now().Add(time.Hour * 24).Unix(), // 24h 过期
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// JWT 中间件
func JWTAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		auth := c.GetHeader("Authorization")
		if len(auth) < 7 || auth[:7] != "Bearer " {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"msg": "未携带 token"})
			return
		}
		tokenStr := auth[7:]

		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			// 校验签名算法，防止 alg=none 攻击
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return jwtSecret, nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"msg": "token 无效"})
			return
		}
		// 把用户名写入上下文，供后续处理函数使用
		claims := token.Claims.(jwt.MapClaims)
		c.Set("username", claims["username"])
		c.Next()
	}
}

func main() {
	r := gin.Default()

	r.POST("/login", func(c *gin.Context) {
		var body struct {
			User string `json:"user" binding:"required"`
			Pass string `json:"pass" binding:"required"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(400, gin.H{"msg": err.Error()})
			return
		}
		// 实际项目需校验账号密码，这里简化
		token, _ := genToken(body.User)
		c.JSON(200, gin.H{"token": token})
	})

	// 受保护路由
	auth := r.Group("/api")
	auth.Use(JWTAuth())
	{
		auth.GET("/me", func(c *gin.Context) {
			username := c.GetString("username")
			c.JSON(200, gin.H{"username": username})
		})
	}

	r.Run()
}
```

调用：

```bash
# 登录拿 token
curl -X POST localhost:8080/login -d '{"user":"tom","pass":"123"}'
# 携带 token 访问
curl localhost:8080/api/me -H "Authorization: Bearer <token>"
```

---

## 14. CORS 跨域处理

浏览器同源策略会拦截跨域请求，后端需返回 CORS 头。使用 `github.com/gin-contrib/cors`：

```bash
go get github.com/gin-contrib/cors
```

```go
import (
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()

	// 允许所有来源（开发用，生产应明确指定）
	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: false,
		MaxAge:           12 * time.Hour,
	}))

	// 或更宽松的快捷方式（仅开发环境）
	// r.Use(cors.Default())

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"msg": "pong"})
	})
	r.Run()
}
```

生产环境建议明确允许的来源：

```go
cors.Config{
	AllowOrigins:     []string{"https://example.com", "https://admin.example.com"},
	AllowMethods:     []string{"GET", "POST", "PUT", "DELETE"},
	AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
	AllowCredentials: true, // 配合前端 withCredentials 时必须 AllowOrigins 不含 *
	MaxAge:           12 * time.Hour,
}
```

---

## 15. 自定义 404 / 405 与 Panic 恢复

```go
func main() {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	// 404
	r.NoRoute(func(c *gin.Context) {
		c.JSON(404, gin.H{"code": 404, "msg": "Not Found"})
	})
	// 405
	r.NoMethod(func(c *gin.Context) {
		c.JSON(405, gin.H{"code": 405, "msg": "Method Not Allowed"})
	})

	r.GET("/", func(c *gin.Context) {
		c.String(200, "ok")
	})
	r.Run()
}
```

> `gin.Default()` 已内置 `Recovery`。若用 `gin.New()` 必须手动 `Use(gin.Recovery())`，否则 panic 会让进程崩溃。

---

## 16. 优雅关闭（Graceful Shutdown）

生产环境不能 `Ctrl+C` 直接掐断连接，应等待在途请求处理完再退出。

```go
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()
	r.GET("/", func(c *gin.Context) {
		c.String(200, "ok")
	})

	srv := &http.Server{
		Addr:    ":8080",
		Handler: r,
	}

	// 在 goroutine 中启动服务（不阻塞）
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("服务启动失败: %v", err)
		}
	}()

	// 监听中断信号
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("正在关闭服务...")

	// 给在途请求 5 秒宽限
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("强制关闭失败:", err)
	}
	log.Println("服务已退出")
}
```

---

## 17. 与 GORM 集成（数据库）

GORM 是 Go 最流行的 ORM。示例展示 Gin + GORM + SQLite 的最小 CRUD。

```bash
go get gorm.io/gorm gorm.io/driver/sqlite
```

```go
package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// 模型
type User struct {
	gorm.Model
	Name  string `json:"name" binding:"required"`
	Email string `json:"email" binding:"required,email"`
}

var db *gorm.DB

func initDB() {
	var err error
	db, err = gorm.Open(sqlite.Open("test.db"), &gorm.Config{})
	if err != nil {
		panic("数据库连接失败")
	}
	// 自动建表
	_ = db.AutoMigrate(&User{})
}

func main() {
	initDB()
	r := gin.Default()

	// 创建
	r.POST("/users", func(c *gin.Context) {
		var u User
		if err := c.ShouldBindJSON(&u); err != nil {
			c.JSON(400, gin.H{"msg": err.Error()})
			return
		}
		db.Create(&u)
		c.JSON(201, u)
	})

	// 列表
	r.GET("/users", func(c *gin.Context) {
		var users []User
		db.Find(&users)
		c.JSON(200, users)
	})

	// 详情
	r.GET("/users/:id", func(c *gin.Context) {
		var u User
		if err := db.First(&u, c.Param("id")).Error; err != nil {
			c.JSON(404, gin.H{"msg": "用户不存在"})
			return
		}
		c.JSON(200, u)
	})

	// 更新
	r.PUT("/users/:id", func(c *gin.Context) {
		var u User
		if err := db.First(&u, c.Param("id")).Error; err != nil {
			c.JSON(404, gin.H{"msg": "用户不存在"})
			return
		}
		var input User
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(400, gin.H{"msg": err.Error()})
			return
		}
		db.Model(&u).Updates(input)
		c.JSON(200, u)
	})

	// 删除
	r.DELETE("/users/:id", func(c *gin.Context) {
		db.Delete(&User{}, c.Param("id"))
		c.JSON(200, gin.H{"msg": "deleted"})
	})

	r.Run(":8080")
}
```

---

## 18. 单元测试（httptest）

Gin 配合标准库 `net/http/httptest` 即可做无依赖的接口测试。

```go
package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// 把路由抽成可复用函数
func setupRouter() *gin.Engine {
	r := gin.Default()
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "pong"})
	})
	return r
}

func TestPing(t *testing.T) {
	gin.SetMode(gin.TestMode) // 关闭日志干扰
	r := setupRouter()

	// 构造请求
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/ping", nil)
	r.ServeHTTP(w, req)

	// 断言
	assert.Equal(t, 200, w.Code)

	var resp map[string]string
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "pong", resp["message"])
}
```

运行：

```bash
go get github.com/stretchr/testify/assert
go test ./...
```

> 要点：`gin.SetMode(gin.TestMode)` 去掉控制台日志；用 `httptest.NewRecorder()` + `r.ServeHTTP(w, req)` 模拟请求，无需真正监听端口。

---

## 19. 推荐项目结构

中小型 Gin 项目的常见分层结构（参考本博客后端 `apps/api_go`）：

```
apps/api_go/
├── main.go              # 入口：组装 router、连接 DB、启动服务
├── go.mod
├── internal/
│   ├── router/          # 路由注册（按模块拆分）
│   │   └── router.go
│   ├── handler/         # 控制器层：解析请求、调 service、写响应
│   │   └── user.go
│   ├── service/         # 业务逻辑层
│   │   └── user.go
│   ├── model/           # 数据模型 / DTO / 校验结构体
│   │   └── user.go
│   ├── middleware/      # 自定义中间件（JWT、CORS、日志）
│   │   └── jwt.go
│   └── pkg/             # 通用工具（响应封装、错误码）
│       └── response.go
├── config/              # 配置文件 / 配置加载
└── static/              # 静态资源
```

分层要点：

- **handler** 只做「收参数 → 调 service → 包装响应」，不写业务逻辑。
- **service** 承载业务规则，可独立测试。
- **model** 区分「请求 DTO（带 binding 标签）」与「数据库模型（带 gorm 标签）」。
- 统一响应封装，避免每个接口手写 `c.JSON`：

```go
// pkg/response.go
func OK(c *gin.Context, data interface{}) {
	c.JSON(200, gin.H{"code": 0, "msg": "ok", "data": data})
}
func Fail(c *gin.Context, code int, msg string) {
	c.JSON(200, gin.H{"code": code, "msg": msg})
}
```

---

## 20. gin.Context 全量 API 速查表

`gin.Context` 是每个请求的处理上下文，下面按用途汇总其全部核心方法（也是本文「接口齐全」的集中速查）。

### 20.1 请求读取

| 方法 | 说明 |
| --- | --- |
| `Param(key)` | 路径参数值 |
| `Query(key)` / `DefaultQuery(key, def)` | 查询参数 |
| `QueryArray(key)` | 同名多值查询参数 |
| `QueryMap(key)` | 映射型查询参数 `?m[k]=v` |
| `PostForm(key)` / `DefaultPostForm(key, def)` | 表单字段 |
| `PostFormArray(key)` | 同名多值表单 |
| `PostFormMap(key)` | 映射型表单 |
| `GetRawData()` | 原始 body 字节 |
| `GetHeader(key)` / `Request.Header.Get` | 请求头 |
| `ClientIP()` | 客户端 IP |
| `ContentType()` | Content-Type |
| `Request` | 底层 `*http.Request` |
| `FullPath()` | 匹配到的路由模板（如 `/users/:id`） |
| `Params` | 路径参数切片（`c.Params.ByName`） |

### 20.2 数据绑定

| 方法 | 说明 |
| --- | --- |
| `Bind(obj)` / `ShouldBind(obj)` | 按 Content-Type 自动绑定 |
| `BindJSON` / `ShouldBindJSON` | 绑 JSON（失败是否写响应） |
| `BindQuery` / `ShouldBindQuery` | 绑查询参数 |
| `BindUri` / `ShouldBindUri` | 绑路径参数 |
| `BindHeader` / `ShouldBindHeader` | 绑请求头 |
| `ShouldBindWith(obj, b)` | 指定绑定引擎（如 `binding.JSON`） |
| `MustBindWith(obj, b)` | 同 ShouldBindWith 但失败写响应 |
| `ShouldBindBodyWith(obj, b)` | 可重复读取 body 的绑定 |

### 20.3 响应写出

| 方法 | 说明 |
| --- | --- |
| `JSON(code, obj)` | 返回 JSON |
| `IndentedJSON(code, obj)` | 缩进 JSON |
| `XML(code, obj)` | 返回 XML |
| `YAML(code, obj)` | 返回 YAML |
| `String(code, format, args)` | 返回格式化文本 |
| `HTML(code, name, data)` | 渲染模板 |
| `Data(code, contentType, data)` | 返回字节流 |
| `File(path)` | 发送文件 |
| `FileAttachment(path, name)` | 带下载名的文件 |
| `Redirect(code, url)` | 重定向 |
| `Status(code)` | 仅写状态码 |
| `Header(key, value)` | 写响应头 |
| `SetCookie(...)` | 写 Cookie |

### 20.4 上下文传值与流程控制

| 方法 | 说明 |
| --- | --- |
| `Set(key, val)` | 存键值 |
| `Get(key)` | 取键值（含是否存在） |
| `MustGet(key)` | 取键值（不存在 panic） |
| `GetString/GetBool/GetInt/GetInt64/GetFloat64/GetTime/GetDuration/GetStringSlice/GetStringMap/GetStringMapString` | 类型安全取值 |
| `Keys` | 底层 map（慎用） |
| `Next()` | 执行后续处理/中间件 |
| `Abort()` | 中断后续处理 |
| `AbortWithStatus(code)` | 中断并返回状态码 |
| `AbortWithStatusJSON(code, obj)` | 中断并返回 JSON |
| `AbortWithError(code, err)` | 中断并记录错误 |
| `IsAborted()` | 是否已中断 |
| `Copy()` | 复制上下文供 goroutine 使用 |
| `Error(err)` / `Errors` | 记录错误，最终统一处理 |
| `Deadline()` / `Done()` / `Err()` / `Value()` | 实现 `context.Context` 接口 |
| `Request.Context()` | 取请求的 context（用于超时/取消） |

### 20.5 Engine / 全局配置

| 方法 / 变量 | 说明 |
| --- | --- |
| `gin.New()` | 创建无中间件的引擎 |
| `gin.Default()` | 创建含 Logger+Recovery 的引擎 |
| `gin.SetMode(mode)` | 设置运行模式 |
| `gin.DisableConsoleColor()` / `ForceConsoleColor()` | 控制台颜色开关 |
| `gin.DefaultWriter` / `gin.DefaultErrorWriter` | 日志输出目标 |
| `r.Run()` / `r.Run(addr)` / `r.RunTLS(addr, cert, key)` / `r.RunUnix(file)` | 启动服务 |
| `r.Use(mws...)` | 挂载全局中间件 |
| `r.Group(prefix, mws...)` | 创建路由分组 |
| `r.GET/POST/PUT/DELETE/PATCH/HEAD/OPTIONS/Any/Handle` | 注册路由 |
| `r.Static/StaticFile/StaticFS` | 静态文件 |
| `r.LoadHTMLGlob/LoadHTMLFiles/SetHTMLTemplate` | 模板加载 |
| `r.SetFuncMap` | 模板函数 |
| `r.NoRoute/NoMethod` | 404 / 405 处理 |
| `r.ServeHTTP(w, req)` | 实现 `http.Handler`，便于测试 |
| `r.MaxMultipartMemory` | 上传内存上限 |

---

## 21. 常见问题与排错

**Q1：`c.Abort()` 之后代码还在执行？**
是的，`Abort()` 只阻止后续处理函数，但**当前中间件/处理函数的剩余代码仍会执行**。中断后通常要加 `return`。

**Q2：绑定 JSON 提示 `EOF`？**
请求体为空或 `Content-Type` 不是 `application/json`。用 `ShouldBindJSON` 时确保客户端发了 body 且 header 正确。

**Q3：同一个 `c` 在 goroutine 里用会乱？**
必须用 `c.Copy()` 复制后再传入 goroutine，否则请求结束后 `c` 被回收复用，数据错乱。

**Q4：生产环境日志太多？**
`gin.SetMode(gin.ReleaseMode)`，并可将 `gin.DefaultWriter` 重定向到文件。

**Q5：路由 `/user/:id` 和 `/user/info` 冲突吗？**
不冲突，字面量 `/user/info` 优先级高于参数段 `/user/:id`。

**Q6：跨域 OPTIONS 请求被拦截？**
浏览器预检（preflight）会先发 OPTIONS。用 `gin-contrib/cors` 后它会自动处理；若手写，记得 `NoMethod` / 显式注册 `OPTIONS` 或放行。

**Q7：panic 没恢复导致进程退出？**
确认用了 `gin.Default()` 或在 `gin.New()` 上 `Use(gin.Recovery())`。

**Q8：Gin 版本要求？**
Gin v1.9.x / v1.10.x 要求 Go ≥ 1.20。新项目建议直接用 v1.10.x。

---

> 本文覆盖了 Gin 从入门到进阶的几乎全部常用接口，建议配合官方文档 <https://gin-gonic.com/docs/> 一起阅读。示例代码均可复制运行，建议每节动手试一遍以加深理解。

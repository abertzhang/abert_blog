package main

import (
	"os"
	"strconv"
	"strings"
)

// Config 聚合运行配置；与 apps/api_express/.env 口径一致。
// api_express=3001 / api_nest=3002 / api_go=3003（端口互不冲突）。
type Config struct {
	Port       string // HTTP 监听端口
	PGHOST     string
	PGPORT     int
	PGDATABASE string
	PGUSER     string
	PGPASSWORD string
	JWTSecret  string
}

// loadConfig 读取环境变量；若存在 .env 则优先加载（不覆盖已存在的环境变量）。
func loadConfig() Config {
	loadEnvFile(".env")
	cfg := Config{
		Port:       getenv("PORT", "3003"),
		PGHOST:     getenv("PGHOST", "localhost"),
		PGDATABASE: getenv("PGDATABASE", "blog"),
		PGUSER:     getenv("PGUSER", "blog"),
		PGPASSWORD: getenv("PGPASSWORD", "blog123456"),
		JWTSecret:  getenv("JWT_SECRET", "abert_blog_default_secret_change_me"),
	}
	pgport, err := strconv.Atoi(getenv("PGPORT", "5433"))
	if err != nil || pgport == 0 {
		pgport = 5433
	}
	cfg.PGPORT = pgport
	return cfg
}

func getenv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

// loadEnvFile 解析简单的 KEY=VALUE 文件（忽略 # 注释与空行，支持单/双引号包裹）。
// 仅当环境变量尚未设置时才写入，避免覆盖 shell 已传入的值。
func loadEnvFile(path string) {
	data, err := os.ReadFile(path)
	if err != nil {
		return
	}
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		k := strings.TrimSpace(parts[0])
		v := strings.TrimSpace(parts[1])
		v = strings.Trim(v, `"'`)
		if k != "" && os.Getenv(k) == "" {
			os.Setenv(k, v)
		}
	}
}

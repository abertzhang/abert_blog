package main

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/lib/pq"
)

// openDB 打开 PostgreSQL 连接池（与 api_express 参数一致：宿主 5433 / 库 blog）。
// 采用惰性连接：启动时不强制 Ping，数据库暂时不可用时服务仍可启动，DB 查询再返回错误。
func openDB(cfg Config) (*sql.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
		cfg.PGHOST, cfg.PGPORT, cfg.PGUSER, cfg.PGPASSWORD, cfg.PGDATABASE,
	)
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(30 * time.Minute)
	// 仅做连通性探测并输出告警，不影响启动（与 api_express 行为一致）。
	if err := db.Ping(); err != nil {
		log.Printf("[warn] PostgreSQL 连接探测失败（%v），服务已启动但数据库相关接口将报错，请确认数据库已运行", err)
	}
	return db, nil
}

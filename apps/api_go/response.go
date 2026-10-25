package main

import (
	"encoding/json"
	"net/http"
)

// Envelope 与前端 axios 响应拦截器对齐的统一信封：
// { code: 0, msg: 'ok', data: <业务对象> }；code != 0 表示业务错误。
type Envelope struct {
	Code int         `json:"code"`
	Msg  string      `json:"msg"`
	Data interface{} `json:"data"`
}

func writeJSON(w http.ResponseWriter, httpStatus int, env Envelope) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(httpStatus)
	_ = json.NewEncoder(w).Encode(env)
}

// ok 成功响应（HTTP 200）。
func ok(w http.ResponseWriter, data interface{}, msg string) {
	if msg == "" {
		msg = "ok"
	}
	writeJSON(w, http.StatusOK, Envelope{Code: 0, Msg: msg, Data: data})
}

// created 创建成功响应（HTTP 201，业务码仍为 0）。
func created(w http.ResponseWriter, data interface{}, msg string) {
	if msg == "" {
		msg = "创建成功"
	}
	writeJSON(w, http.StatusCreated, Envelope{Code: 0, Msg: msg, Data: data})
}

// fail 业务失败响应：HTTP 状态码默认与业务码一致（>=400 时），data 恒为 null。
// 与 api_express utils/response.js 的 fail() 行为一致。
func fail(w http.ResponseWriter, code int, msg string) {
	httpStatus := http.StatusOK
	if code >= 400 {
		httpStatus = code
	}
	writeJSON(w, httpStatus, Envelope{Code: code, Msg: msg, Data: nil})
}

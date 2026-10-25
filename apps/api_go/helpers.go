package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// phoneRE 手机号校验（与 api_express 一致）：1 开头，第二位 3-9，共 11 位。
var phoneRE = regexp.MustCompile(`^1[3-9]\d{9}$`)

// parseIntDefault 解析整型查询参数，缺省或非法时回退默认值。
func parseIntDefault(s string, def int) int {
	if s == "" {
		return def
	}
	v, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	return v
}

// toStr 把请求体里的字段安全地转成字符串。
func toStr(v interface{}) string {
	switch t := v.(type) {
	case string:
		return t
	case nil:
		return ""
	default:
		return fmt.Sprint(t)
	}
}

// toInt64 把请求体里的数字（JSON 默认 float64）或数字字符串转成 int64。
func toInt64(v interface{}) (int64, bool) {
	switch t := v.(type) {
	case float64:
		return int64(t), true
	case int64:
		return t, true
	case string:
		i, err := strconv.ParseInt(strings.TrimSpace(t), 10, 64)
		if err == nil {
			return i, true
		}
	}
	return 0, false
}

// toBool 把请求体里的布尔字段规范化（兼容 bool / 数字 / 字符串）。
func toBool(v interface{}) bool {
	switch t := v.(type) {
	case bool:
		return t
	case float64:
		return t != 0
	case string:
		return t == "true" || t == "1"
	}
	return false
}

// toTime 解析常见时间字符串（ISO8601 等）为 time.Time。
func toTime(v interface{}) (time.Time, bool) {
	s, ok := v.(string)
	if !ok {
		return time.Time{}, false
	}
	for _, layout := range []string{time.RFC3339, "2006-01-02T15:04:05", "2006-01-02 15:04:05", "2006-01-02"} {
		if t, err := time.Parse(layout, s); err == nil {
			return t, true
		}
	}
	return time.Time{}, false
}

// decodeBody 把 JSON 请求体解码为 map（与 api_express 灵活读取 b.xxx 的行为一致）。
func decodeBody(r *http.Request) (map[string]interface{}, error) {
	var m map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		return nil, err
	}
	return m, nil
}

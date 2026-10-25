package main

import (
	"fmt"
	"math/rand"
	"net/http"
	"strings"
	"time"
)

// 首页 banner 封面图源：aknot 公共图床（land / car / moto 三类，编号 01~50）。
const bannerCoverBase = "https://img-common.aknot.uk/cover"

var bannerTypes = []string{"land", "car", "moto"}

// handleBanners 随机返回 count 张封面图（默认 5，范围 1~10），类型随机、编号随机、去重。
func (app *App) handleBanners(w http.ResponseWriter, r *http.Request) {
	n := parseIntDefault(r.URL.Query().Get("count"), 5)
	ok(w, pickSlides(n), "ok")
}

// pickSlides 生成 n 张不重复的随机封面图。
func pickSlides(n int) []BannerSlide {
	count := n
	if count < 1 {
		count = 5
	}
	if count > 10 {
		count = 10
	}
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	seen := map[string]bool{}
	slides := []BannerSlide{}
	guard := 0
	for len(slides) < count && guard < 200 {
		guard++
		t := bannerTypes[r.Intn(len(bannerTypes))]
		idx := r.Intn(50) + 1 // 1~50
		key := fmt.Sprintf("%s-%d", t, idx)
		if seen[key] {
			continue
		}
		seen[key] = true
		slides = append(slides, BannerSlide{
			Image:    fmt.Sprintf("%s/%s-%02d.jpg", bannerCoverBase, t, idx),
			Category: strings.ToUpper(t[:1]) + t[1:], // Land / Car / Moto
		})
	}
	return slides
}

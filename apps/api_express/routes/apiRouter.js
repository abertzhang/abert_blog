'use strict';

/**
 * 博客 API 聚合路由
 *
 * 所有前端接口统一挂在 /blog/api 前缀下（与前端 axios baseURL 一致）。
 * 子路由：
 *   /auth         认证（登录 / 短信 / 当前用户）
 *   /categories   分类（列表 + 管理员 CRUD）
 *   /articles     文章（列表 / 详情 / 管理 CRUD / 评论）
 *   /friend-links 友情链接（列表 + 管理员 CRUD）
 *   /hot /wordcloud /tags  热度与标签云（直接挂在 /blog/api 根下）
 *   /banners              首页轮播封面图（从公共图床随机取图，无需数据库）
 */

const express = require('express');
const router = express.Router();

const authRouter = require('./authRouter');
const categoryRouter = require('./categoryRouter');
const articleRouter = require('./articleRouter');
const statRouter = require('./statRouter');
const friendLinkRouter = require('./friendLinkRouter');
const adminRouter = require('./adminRouter');
const bannerRouter = require('./bannerRouter');

router.use('/auth', authRouter);
router.use('/categories', categoryRouter);
router.use('/articles', articleRouter);
router.use('/friend-links', friendLinkRouter);
router.use('/admin', adminRouter);
router.use('/banners', bannerRouter);
// statRouter 内部定义 /hot、/wordcloud、/tags 三个根路径
router.use(statRouter);

module.exports = router;

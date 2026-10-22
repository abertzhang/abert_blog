const express = require('express');
const swaggerUi = require("swagger-ui-express");
const router = express.Router();

/**
 * @swagger
 * /article:
 *   get:
 *     summary: 获取文章列表
 *     description: 返回文章列表占位字符串（示例接口）
 *     responses:
 *       200:
 *         description: 成功返回文章数据
 */
router.get('/article', (req, res) => {
    res.send('articles');
})
module.exports = router;

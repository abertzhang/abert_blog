const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'Blog API Documentation', version: '1.0.0' },
  },
  // 扫描路由文件生成 Swagger 注解（路由文件含 @swagger 块时自动收录）
  apis: ['./routes/*.js'],
});

const apiRouter = require('./routes/apiRouter');

const app = express();

// view engine setup（保留配置，不影响 JSON API）
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// ---- 中间件：必须在路由挂载之前，否则路由内拿不到 req.body ----
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ---- CORS：允许 Flutter Web / 浏览器端跨域访问 /blog/api ----
// 移动端（iOS / Android）原生 HTTP 请求不受浏览器同源策略约束，无需此配置；
// 这里为零依赖手写实现，覆盖预检（OPTIONS）与简单请求两种场景。
app.use('/blog/api', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ---- Swagger 文档（独立于 /blog/api，便于调试）----
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ---- 博客 API：统一前缀 /blog/api（与前端 axios baseURL 一致）----
app.use('/blog/api', apiRouter);

// ---- 健康检查 / 根路径 ----
app.get('/', (req, res) => res.json({ service: 'blog-api', status: 'ok' }));

// ---- 404：/blog/api 下未匹配的接口 → JSON 信封 ----
app.use('/blog/api', (req, res) => {
  res.status(404).json({
    code: 404,
    msg: `接口不存在: ${req.method} ${req.originalUrl}`,
    data: null,
  });
});

// ---- 404：其它路径 ----
app.use((req, res, next) => next(createError(404)));

// ---- 错误处理：API 请求返回 JSON 信封，页面请求退回 jade 错误页 ----
app.use((err, req, res, next) => {
  const isApi =
    req.originalUrl.startsWith('/blog/api') ||
    (req.headers.accept || '').includes('application/json');
  if (isApi) {
    const code = err.status || 500;
    return res.status(code).json({
      code,
      msg: err.message || '服务器内部错误',
      data: null,
    });
  }
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

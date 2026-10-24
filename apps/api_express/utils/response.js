'use strict';

/**
 * 统一响应信封工具
 *
 * 前端 src/api/client.ts 的响应拦截器会直接抽离 { code, msg, data } 交给业务层，
 * 因此所有 /blog/api 接口都必须套用该信封：
 *   { code: 0, msg: 'ok', data: <业务对象> }
 * - code === 0 表示成功；非 0 表示业务错误（前端用 msg 提示）
 * - code === 401 时前端会清空本地 token 与 user（强制重新登录）
 */

/**
 * 成功响应
 * @param {import('express').Response} res
 * @param {*} data 业务数据
 * @param {string} [msg]
 * @param {number} [httpStatus]
 */
function ok(res, data, msg = 'ok', httpStatus = 200) {
  res.status(httpStatus).json({ code: 0, msg, data });
}

/**
 * 业务失败响应（仍返回 JSON 信封，前端统一处理）
 * @param {import('express').Response} res
 * @param {number} code 业务错误码（401 未登录 / 403 无权限 / 404 不存在 / 4xx 参数错误）
 * @param {string} msg 提示信息
 * @param {number} [httpStatus] HTTP 状态码，默认与 code 一致（业务码非 2xx 时用）
 */
function fail(res, code, msg, httpStatus) {
  const status = httpStatus || (code >= 400 ? code : 200);
  res.status(status).json({ code, msg, data: null });
}

/**
 * 异步路由包装器：捕获 async 处理函数中的异常并转交 Express 错误中间件。
 * Express 4 不会自动 catch 路由里 await 抛出的异常，必须用此包装（或 try/catch）。
 * @param {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => any} fn
 */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { ok, fail, asyncHandler };

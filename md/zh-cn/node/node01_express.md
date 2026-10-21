---
title: Express Framework
create:2026-10-04
update:2026-10-07
category:node
tags:[http,node,server]
summary:
keywords:[node,express,http,server,backend,middleware]
top:1
copyright:true
---

## Introducation

### 官网

https://expressjs.com/

https://www.expressjs.com.cn/zh-cn/

### 环境配置

```
npm i express
npm i express --no-save
//
npm i express-generator
nmp i -g nodemon

```





## express generator

### Install

```
//
npx express-generator
//
npm install -g express-generator
```

### Command

```
express [options] [dir]

```



## Route

### route param

```
// 127.0.0.1:3000/12.html
app.get('/:id.html', (req,res,next) => {
    console.info(req.params.id);
    res.end(`${req.params.id} html`);
})
```

### 响应设置

```
app.get('/', (req,res,next) => {
    res.statusCode = 200;
    res.statusMessage = 'ok';
    res.setHeader('abc','xyz')
    res.write('test')
    res.end('home');
})
```

```
app.get('/login', (req,res,next) => {
    res.status(500)
    res.set('login','false');
    res.send('login-body')
    res.status(200).set('code', 'invalid').send('error')
})
```

```
app.get('/logout', (req,res,next) => {
    res.redirect('https://baidu.com');
    res.download('./package.json');
    res.json({"message": "ok"});
    res.sendFile(__dirname+'home.html')
})
```

### Not found

```
app.all('/{*splat}', (req, res) => {
    res.status(404).send('404 Not Found')
})
```



### middleware

#### global middleware

```
app.use(recordUrl)
function recordUrl(req, res, next) {
    const base = `${req.protocol}://${req.get('host')}`          // http://127.0.0.1:9000
    const query = req.url.includes('?')                          // 是否存在查询串
        ? req.url.slice(req.url.indexOf('?'))                    // 截取 ?xxx 这一段
        : ''                                                    // 无查询则留空
    const fullUrl = base + req.path + query                      // 完整地址：协议://主机+路径+查询
    const filePath = path.join(__dirname, 'urls.txt')
    fs.appendFileSync(filePath, fullUrl + '\n', 'utf8')          // 同步追加，确保 demo 不丢行

    next()  // 必须调用，放行给下一个匹配的中间件 / 路由
}
```



#### route middleware

```
function isLogin (req, res, next) {
    console.log(`middleware isLogin`)
    next()
}
app.get('/admin',isLogin, (req, res) => {
    res.end('admin')
})
```



### static

```
app.use(express.static(__dirname+'/public'))
```

### Request Body

#### body-parser

```
npm i body-parser
```

#### use

```
const bodyParser = require("body-parser");
const app = express()
const jsonParser = bodyParser.json()
const urlencodedParser = bodyParser.urlencoded({ extended: false })
// global middleware
app.use(jsonParser)
// route middleware
app.post('/login',jsonParser ,(req, res) => {
    console.log(req.body)
    res.end('login')
})

```

### 防盗链

```
```

### Router Module

```
// import express from "express";
const express = require('express')
const router = express.Router()
router.get('/admin', (req, res) => {
    res.end('admin')
})
router.get('/admin/profile', (req, res) => {
    res.end('admin/profile')
})
module.exports = router
```

```
const express = require('express')
const homeRouter = require('./homeRouter')
const adminRouter = require('./adminRouter')
const app = express()

/// 挂载两个子路由：路径前缀在这里不写，由各自 router 内部决定（homeRouter 管 /home、/login；adminRouter 管 /admin）
app.use(homeRouter)
app.use(adminRouter)

/// 兜底路由：Express 5 必须写 '/{*splat}'（裸 '*' 会启动抛 PathError）
app.all('/{*splat}', (req, res) => {
    res.status(404).send('Not Found')   // 注意：是 res.send，不是 app.send
})

app.listen(9000, () => {
    console.log('Server running on port 9000.')
})
```

## Templete

### ejs templete

#### Introducaiton

https://ejs.co

https://ejs.bootcss.com

#### require

```
const ejs = require('ejs')
```

#### Use in express framework

```
app.set('view engine','ejs')
app.set('views','./views')
```

```
// home.ejs 必须在./views文件夹中
res.rend('home',{name,age})
```


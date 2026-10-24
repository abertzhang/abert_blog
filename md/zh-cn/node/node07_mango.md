---
title: MangoDB
create:2026-10-04
update:2026-10-07
category:other
cover:https://img-common.aknot.uk/cover/land-39.jpg
tags:[database]
summary:
keywords:[node,mongodb,database,document,crud]
top:1
copyright:true
---

## Introducation

### office web

https://www.mongodb.com

### download web

https://www.mongodb.com/try/download/community

### mongoose doc web

https://mongoosejs.net/

#### Install

```
brew tap mongodb/brew
# 信任整个 tap（推荐）
brew trust mongodb/brew

# 或只信任这一个 formula
brew trust --formula mongodb/brew/mongodb-community

brew install mongodb-community


# 以后台服务方式运行（开机自启）
brew services start mongodb-community

# 或前台手动运行
mongod --config /usr/local/etc/mongod.conf

```

## Server

### docker

## Client

### MongoDB Compass

mongoDB

### DBeaver

postgreSQL和MySQL

### Mongo Command

```
show dbs
use 数据库名
//
use admin
db.auth("account","pwd")
```



## ORM

#### mongoose

##### Install

```
npm i mongoose
```

##### Common Method

```
//
mongoose.set('strictQuery',true)
// 如果不存在则创建
mongoose.connect('mongodb://localhost:27017/all_in_node')
// 断开连接
mongoose.disconnect()
```

### Connect Method

```
// 打开监听
mongoose.connection.on('open',()=>{
    console.log('connected to mongodb-open')
})
// 一次打开监听
mongoose.connection.once('open',()=>{
    console.log('connected to mongodb-once')
})
// 错误监听
mongoose.connection.on('error',(err)=>{
    console.log(err)
})
// 关闭监听
mongoose.connection.on('close',()=>{
    console.log('connected to close mongodb')
})
```

### create DB

```
use admin
db.auth("root", "你的管理员密码")
// 隐式创建
use demo_db
db.users.insertOne({name:"张三", age:20})
db.users.find()
```

```
// 查看所有数据库
show dbs        
show collections // 查看当前库下所有集合（表）
```

````
// 显式创建
use demo_db
db.createCollection("users")
// 固定大小集合，日志常用
db.createCollection("logs", { capped: true, size: 5242880 })
````

```
use demo_db
db.runCommand({ create: "users" })
```

```
// 创建普通业务用户（给这个库读写权限）
use demo
db.createUser({
  user: "demo_user",
  pwd: "demo_pwd123",
  roles: ["readWrite"]
})
```

### Schema

```
const mongoose = require('mongoose')
// 关闭严格查询模式告警
mongoose.set('strictQuery', true)
// 地址+数据库名+权限
mongoose.connect('mongodb://root:Zhang1234!@localhost:27017/abert?authSource=admin')
mongoose.connection.once('open', () => {
    createDocument()
})

/// 连接级错误（如认证失败、网络中断）统一在此捕获
mongoose.connection.on('error', (err) => {
    console.log('连接出错:', err)
})
mongoose.connection.on('close', () => {
    console.log('connected to close mongodb')
})
// 向数据库abert的books 集合写入一条图书文档
async function createDocument() {
    // 定义集合结构（Schema）：书名、作者、价格
    const BookSchema = new mongoose.Schema({
        name: String,
        author: String,
        price: Number,
    })
    // 编译模型；第三个参数显式指定集合名为 books，避免 Mongoose 自动复数化歧义
    const BookModel = mongoose.model('BookModel', BookSchema, 'books')
    // Mongoose 8/9 起 Model.create() 不再接受回调，必须改用 await + try/catch
    BookModel.create({
        name: '西游记',
        author: '吴承恩',
        price: 19.9
    })
        .then(()=>{
            console.log("写入成功")
        })
        .catch(err => console.log(err))
        .finally(mongoose.disconnect)
}
```

### 字段以及验证

```
```



### 删除文档

```
BookModel.deleteOne({name:'条件'}，(err,data)=>{})
BookModel.deleteMany({name:'条件'}，(err,data)=>{})
```



### 更新文档

```
BookModel.updateOne({name:"条件"}，{price:7.0},(err,data)=>{})
BookModel.updateMany({author:"条件"}，{is_hot:true},(err,data)=>{})
```



### 查询文档

```
BookModel.findOne({name:""},(err,data)=>{})
BookModel.find({name:""},(err,data)=>{})
BookModel.find((err,data)=>{})// 获取所有
BookModel.findById("id..",(err,data)=>{})
```


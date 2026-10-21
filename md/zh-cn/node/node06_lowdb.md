---
title: lowdb
create:2026-10-04
update:2026-10-07
category:node
tags:[database,json,server]
summary:
keywords:[node,lowdb,json,database,storage]
top:1
copyright:true
---

## Env config

```
```



## Use  Method

```
// npm i lowdb@1.0.0
// npm i shortid
const path = require('path')
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const shortid = require('shortid')
/// 适配器：把数据持久化到「脚本同目录」下的 db.json（同步读写）。
/// 用 __dirname 拼接，保证无论从哪个目录执行，文件都落在 third/ 下，而不受当前工作目录影响。
const adapter = new FileSync(path.join(__dirname, 'db.json'))
const db = low(adapter)
let id = shortid.generate()
// 初始化默认值（仅当对应键不存在时才写入，已有数据不会被覆盖）
db.defaults({
    posts: [{ id: 2, name: 'zhang' }],
    user: {}            // 修复拼写：uer -> user
}).write()

// 写入：往 posts 数组追加两条
db.get('posts').push({ id: id, name: "John" }).write()
db.get('posts').push({ id: 3, name: "Albert" }).write()

// 读取：打印当前 posts
console.log(db.get('posts').value())

// 删除：移除 id 为 1 的记录；res 接收被删除的项（此处仅演示，可不用）
let res = db.get('posts').remove({ id: 1 }).write()

// 用 push 追加（修复：原 .add 是数值加法，会把数组写成 NaN）
db.get('posts').push({ id: 5, name: "John" }).write()
// 查找 id 为 5 的记录（注意：去掉 let，复用上面的 res 声明，避免重复声明报错）
res = db.get('posts').find({ id: 5 }).value()
console.log('find id=5 ->', res)

// 更新：把 id 为 3 的 name 改为 "Albert change"
db.get('posts').find({ id: 3 }).assign({ name: "Albert change" }).write()

// 最终读取并打印
console.log(db.get('posts').value())

```




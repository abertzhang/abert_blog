---
title: MySql
create:2026-10-04
update:2026-10-07
category:other
cover:https://img-common.aknot.uk/cover/land-10.jpg
tags:[database]
summary:
keywords:[node,mysql,database,sql,docker,rdbms]
top:1
copyright:true
---

## Docker

### Install

docker

docker-compose

### Config docker-compose.yml

mysql configurations 

client tool : sequel ace

```
# 新版 Compose 规范已废弃顶层的 version 字段，删除后不再告警
# （Compose v2 / Docker Desktop 内置 compose 插件按文件内容自动识别 schema）
services:
  mysql:
    image: mysql:8.3.0
    command: mysqld --character-set-server=utf8mb4 --collation-server=utf8mb4_general_ci
    # 注意：列表写法下 KEY 与 VALUE 之间「不能有空格」，否则整串会被当成变量名（带尾随空格），
    # 导致 MYSQL_ROOT_PASSWORD 未正确设置、容器启动报错。
    environment:
      - MYSQL_ROOT_PASSWORD=Zhang1234!
      - MYSQL_LOWER_CASE_TABLE_NAMES=0
    ports:
      - "3306:3306"
    # 绑定挂载：宿主机 ./data/mysql 映射到容器内 MySQL 真实数据目录 /var/lib/mysql
    # （原文件写成 /var/lib/msql 是笔误，会导致数据无法正确持久化）
    volumes:
      - ./data/mysql:/var/lib/mysql

```

mongoDB configurations

client tool : mongo compass

```
services:
  mongodb:
    image: mongo:7.0
    # MongoDB 的鉴权初始化变量：首次启动会用这两个值创建 root 超级用户
    environment:
      - MONGO_INITDB_ROOT_USERNAME=root
      - MONGO_INITDB_ROOT_PASSWORD=Zhang1234!
      # 首次启动自动创建一个默认业务库（仅在建库阶段生效一次，之后改名需手动操作）
      - MONGO_INITDB_DATABASE=myapp
    ports:
      - "27017:27017"
    # 绑定挂载：宿主机 ./data/mongodb 映射到容器内 MongoDB 真实数据目录 /data/db
    volumes:
      - ./data/mongodb:/data/db
    # 健康检查：用容器内自带的 mongosh 执行 ping 命令，确认 mongod 真的能响应
    # （mongo:7.0 镜像已内置 mongosh；start_period 给首次初始化留足时间）
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.runCommand({ ping: 1 }).ok", "--quiet"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
```



Postgre

client tool : DBeaver Community ,

```
brew install --cask dbeaver-community
```



```
services:
  postgres:
    image: postgres:16
    # PostgreSQL 初始化变量：首次启动（数据目录为空时）按这些值建超级用户与默认库
    environment:
      - POSTGRES_USER=root
      - POSTGRES_PASSWORD=Zhang1234!
      - POSTGRES_DB=myapp
    ports:
      - "5432:5432"
    # 绑定挂载：宿主机 ./data/postgres 映射到容器内 PostgreSQL 数据目录 /var/lib/postgresql/data
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    # 健康检查：pg_isready 探测连接可用性；启动阶段会先 reject 连接（退出码 1），
    # 直到真正 ready 才返回 0，配合 retries 实现「等它真正起来」
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U root -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
```

Redis

```
services:
  redis:
    image: redis:7
    # 官方 redis 镜像不会自动读 env 设密码，需用 command 显式开启 requirepass 鉴权
    command: ["redis-server", "--requirepass", "Zhang1234!"]
    ports:
      - "6379:6379"
    # 绑定挂载：宿主机 ./data/redis 映射到容器内默认持久化目录 /data（RDB 快照落盘处）
    volumes:
      - ./data/redis:/data
    # 健康检查：redis-cli 带密码 ping，返回 PONG（退出码 0）即健康
    # （redis-cli -a 会把明文密码告警打到 stderr，但不影响健康检查判定）
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "Zhang1234!", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
```



### Command

```
docker-compose up -d          # 一次性拉起 mysql + mongodb
docker-compose ps             # 看状态，应为 Up
docker-compose logs mongodb   # 单独看 mongodb 日志
```



### Client Tool

mac: sequel ace

### ORM

#### sequelize

```
npm i -g sequelize-cli
```


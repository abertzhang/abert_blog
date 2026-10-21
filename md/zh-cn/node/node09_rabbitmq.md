---
title: Express Framework
create:2026-10-04
update:2026-10-07
category:node
tags:[http,node,server]
summary:
keywords:[node,rabbitmq,mq,amqp,docker,message-queue]
top:1
copyright:true
---

## docker配置

```
  rabbitmq:
    # 用「带 management 插件」的镜像，便于通过浏览器访问管理后台（端口 15672）
    image: rabbitmq:3-management
    # 初始化默认账号密码（首次启动生效一次）；不设则默认 guest/guest，仅允许本机连接
    environment:
      - RABBITMQ_DEFAULT_USER=root
      - RABBITMQ_DEFAULT_PASS=Zhang1234!
    ports:
      - "5672:5672"      # AMQP 协议端口，应用用 amqp 客户端连接
      - "15672:15672"    # 管理界面端口，浏览器访问 http://localhost:15672
    # 绑定挂载：宿主机 ./data/rabbitmq 映射到容器内数据目录 /var/lib/rabbitmq
    volumes:
      - ./data/rabbitmq:/var/lib/rabbitmq
```

```
docker-compose up -d rabbitmq    # 应成功拉取并启动
docker-compose ps rabbitmq       # 看 STATUS 变 healthy
```

```
// 后台

```


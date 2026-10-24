---
title: NestJs训练营：基础
create:2026-10-11
update:2026-10-12
category:nodejs
cover:https://img-common.aknot.uk/cover/land-49.jpg
tags:[node,backend]
summary:
keywords:[nestjs,node,backend,module,controller,dependency-injection]
top:1
copyright:true
---

## 安装NestJs

```
//
npm i -g @nestjs/cli
//
npm run start        # 生产启动
npm run start:dev    # 开发热更新（最常用）
npm run start:debug  # 调试
npm run build        # 打包
npm run test         # 单元测试
npm run test:e2e     # 端到端测试
```

```
//
pnpm add -g @nestjs/cli
pnpm start:dev
// 配置镜像
pnpm config set registry https://registry.npmmirror.com/
//方式1：pnpm dlx 临时调用 @nestjs/cli（推荐，不用全局装nest）
pnpm dlx @nestjs/cli new . --package-manager pnpm
//
nest new . --package-manager pnpm
// 跳过git初始化
pnpm dlx @nestjs/cli new . --package-manager pnpm --skip-git
// 只生成代码，不自动安装依赖（之后手动 pnpm install）
pnpm dlx @nestjs/cli new . --package-manager pnpm --skip-install
```

```
// 不安装nestjs cli
pnpm dlx @nestjs/cli new my-project
```

```
# 全局装 Nest CLI（装一次即可）
pnpm add -g @nestjs/cli
# 创建项目（nest new 会自动用 pnpm 装依赖）
nest new my-project
# 或指定包管理器
nest new my-project --package-manager pnpm
```



## 环境配置

```
// 支持express
npm i express-session --save
npm i @types/express-session -D
// session配置
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableVersioning({
    type: VersioningType.URI,
  });
  app.use(
    session({
      secret: 'xxxx',
      name: 'xc.session',
      rolling: true,
      cookie: { maxAge: null },
    }),
  );
  await app.listen(3000);
}
```

```
// 支持fastify

```



## NestJs常用命令

```
nest new //快速创建项目
nest generate //快速生成各种代码
nest build //使用 tsc 或者 webpack 构建代码
nest start //启动开发服务，支持 watch 和调试
nest info //打印 node、npm、nest 包的依赖版本
nest g resource xxx //快速创建 REST API 的模块
```

```
nest --version
nest new project-name
nest n project-name
//
nest g mo user //生成模块
// 生成控制器（跳过测试文件）
nest g c user --no-spec
nest g s user 生成服务

```

```
# 模块 module
nest g module users
# 控制器 controller（接口路由）
nest g controller users
# 服务 service（业务逻辑）
nest g service users
# 完整CRUD资源（module + controller + service + dto + entity，一键全套）
nest g resource users
# 管道 pipe
nest g pipe validation
# 守卫 guard（鉴权）
nest g guard auth
# 拦截器 interceptor
nest g interceptor transform
# 过滤器 filter（异常捕获）
nest g filter http-exception
# 自定义装饰器 decorator
nest g decorator roles
```

```
# 编译ts到dist目录
nest build
# 开发模式（自动热重载）
nest start --watch
# 生产模式启动（先build再运行）
nest start
# 调试模式
nest start --debug --watch
# 引入nest官方库（如typeorm、config）
nest add @nestjs/config
# 升级nest版本
nest upgrade
```

```
// 1、生成controller.ts
nest g co user
// 2、生成module.ts
nest g mo user
// 3、生成service.ts
nest g s user
// 快速生成 user
nest g resource user
```



## 项目结构

默认项目结构

```
├── README.md                       自述文件
├── nest-cli.json                   NestJs项目配置
├── package.json                    npm文件
├── src                             项目源码
│   ├── app.controller.spec.ts      控制器测试文件
│   ├── app.controller.ts           控制器类
│   ├── app.module.ts               模块类
│   ├── app.service.ts              服务类
│   └── main.ts                     项目入口文件
├── test                            测试目录
│   ├── app.e2e-spec.ts             应用e2e测试
│   └── jest-e2e.json               jest e2e测试配置
├── tsconfig.build.json             生产环境Typescript所用
├── tsconfig.json                   开发环境Typescript配置
├── tslint.json                     tslint配置
└── yarn.lock                       yarn锁文件
```

推荐项目结构

```
src
├── main.ts                 # 入口文件，启动 Nest 应用
├── app.module.ts           # 根模块
├── app.controller.ts       # 根控制器（可选，健康检查用）
├── app.service.ts
├── common/                 # 全局通用公共层（跨模块复用）
│   ├── decorators/         # 自定义装饰器 @Roles() 等
│   ├── filters/            # 全局异常过滤器 HttpExceptionFilter
│   ├── guards/             # 全局守卫 JwtAuthGuard
│   ├── interceptors/       # 响应格式化拦截器、日志拦截器
│   ├── pipes/              # 全局校验管道 ValidationPipe
│   └── utils/              # 工具函数、常量、枚举
├── config/                 # 配置模块（@nestjs/config）
│   ├── configuration.ts    # 环境变量配置
│   └── validation.schema.ts# env 校验 schema
├── database/               # 数据库相关（TypeORM）
│   └── database.module.ts  # TypeOrmModule 注册，也可以放迁移migrations
├── modules/                # ✅ 业务模块目录（所有业务放这里）
│   ├── users/              # 用户业务模块
│   │   ├── dto/            # 请求/响应DTO
│   │   │   ├── create-user.dto.ts
│   │   │   └── update-user.dto.ts
│   │   ├── entities/       # TypeORM Entity 数据库实体
│   │   │   └── user.entity.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── users.module.ts
│   └── auth/               # 鉴权模块
│       ├── dto/
│       ├── auth.controller.ts
│       ├── auth.service.ts
│       └── auth.module.ts
└── migrations/             # TypeORM数据库迁移文件（生产强烈推荐，替代 synchronize:true）

# 根目录文件
├── .env                    # 环境变量
├── .env.development
├── .env.production
├── nest-cli.json
├── package.json
├── tsconfig.json
```

## code规范

```
200 OK
304 Not Modified 协商缓存了
400 Bad Request 参数错误
401 Unauthorized token错误
403 Forbidden referer origin 验证失败
404 Not Found 接口不存在
500 Internal Server Error 服务端错误
502 Bad Gateway 上游接口有问题或者服务器问题
```

## 装饰器

### @Request()

### @Response()

#### @Next()

### @Session()

### @Param(key?: string)

### @Query(key?: string)

### @Headers(name?: string)

### @Body(key?: string)

### @HttpCode



## swagger

### 安装依赖

```
npm install  @nestjs/swagger swagger-ui-express
//
pnpm install @nestjs/swagger swagger-ui-express
```

### 配置swagger

```
// bootstrip
SwaggerModule.setup('/api-docs',app,document)
```
### 配置示例
```
import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  // 1) 构建 Swagger 文档配置（标题 / 描述 / 版本等元信息）
  const config = new DocumentBuilder()
    .setTitle('All In API')
    .setDescription('NestJS 示例项目接口文档')
    .setVersion('1.0')
    .build();
  // 2) 根据配置 + 已创建的应用实例，生成 OpenAPI document 对象
  //    （原代码直接引用未定义的 document 变量，运行时必抛 ReferenceError，
  //     此处补足 createDocument 调用，删掉了压报错的 @ts-ignore）
  const document = SwaggerModule.createDocument(app, config);
  // 3) 把 Swagger UI 挂载到 '/api-docs'，启动后访问 http://localhost:3000/api-docs 查看
  SwaggerModule.setup('/api-docs', app, document);
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
```

### 查看docs地址

```
http://localhost:3000/api-docs
```

## TypeOrm

### 安装依赖

```
npm install --save @nestjs/typeorm typeorm mysql2
//
pnpm install --save @nestjs/typeorm typeorm mysql2
```

### 注册数据库

```
TypeOrmModule.forRoot({
      type: 'mysql', // 数据库类型
      username: 'root', // 账号
      password: '123456', // 密码
      host: 'localhost', // host
      port: 3306, //
      database: 'nestjs-demo', // 库名
      entities: [__dirname + '/**/*.entity{.ts,.js}'], // 实体文件
      synchronize: true, // synchronize字段代表是否自动将实体类同步到数据库
      retryDelay: 500, // 重试连接数据库间隔
      retryAttempts: 10, // 重试连接数据库的次数
      autoLoadEntities: true, // 如果为true,将自动加载实体 forFeature()方法注册的每个实体都将自动添加到配置对象的实体数组中
    }),
```

### 注册示例

```
import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UserModule } from './user/user.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
export const { ObserveModule, ObserveInstrument } = createObserveModule();
@Module({
  imports: [
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'all_in_nestjs',
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'Zhang1234!',
      database: 'abert',
      synchronize: true,
      logging: true,
      retryDelay: 1000,
      retryAttempts:1000,
      autoLoadEntities: true,
    }),
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

## 事务概念

- 事务的概念：事务是用户定义的一个数据库操作序列，这些操作要么全做要么全不做，是一个不可分割的工作单位。例如在关系数据库中，一个事务可以是一条SQL语句、一组SQL语句。

- 事务是恢复和并发控制的基本单位。

- 事务通常是以BEGIN TRANSACTION开始，以COMMIT或ROLLBACK结束。COMMIT表示提交，ROLLBACK表示回滚，在事务运行的过程中发生某种故障事务不能继续执行，系统就会将事务对数据库的已完成操作全部撤销，从而回滚到事务开始时的状态。

- 保证事务ACID特性是事务处理的重要任务。

- 事务的特性：原子性（Atomicity）、一致性（Consistency）、隔离性（Isolation）、持续性（Durability），简称ACID

  - 原子性：事务是数据库的逻辑工作单位，事务中包括的操作要么都做，要么都不做
  - 一致性：事务执行的结果必须是使数据库从一个一致性状态变到另一个一致性状态。事务执行过程中出现故障则称这时的数据库处于不一致性状态。
  - 隔离性：一个事务的执行不能被其他事务干扰，并发执行的各个事务之间不能互相干扰
  - 持续性（永久性）：一个事务一旦提交，它对数据库中数据的改变就应该是永久性的。

  事务的ACID特性可能遭到破坏的因素有

  - 多个事务并行运行时，不同事务的操作交叉执行
  - 事务在运行过程中被强制停止



## Prisma

### 安装依赖

```
npm install @prisma/client prisma --save-dev
npx prisma init
npx prisma migrate dev --name init

```

```
// 安装并初始化
pnpm dlx prisma init --datasource-provider mysql
// 初始化
pnpm prisma init --datasource-provider mysql
// prisma是开发依赖；@prisma/client 运行依赖
pnpm add -D prisma
pnpm add @prisma/client

```

### 迁移migrate

```
npx prisma migrate dev --name init
```

### 注意事项

```
修改模型后必须迁移：改完 schema.prisma，一定要跑 npx prisma migrate dev，否则数据库结构没变，代码会报错。
改模型后重启 Nest 服务：由于 Prisma Client 是生成在 node_modules 里的，Nest 的热重载（HMR）有时感知不到变化。如果遇到类型提示不更新，建议 Ctrl+C 后重新 npm run start:dev。
findUnique vs findFirst：findUnique 的 where 条件必须包含唯一字段（如 id 或 @unique 标记的字段），否则会报错。如果想按普通字段查，请用 findFirst。
软删除实现：Prisma 没有内置 @SoftDelete，需要在模型中手动加 deletedAt DateTime?，并在 findMany 时全局过滤 deletedAt: null。
```



## 中间件

代码

```
// src\middleware\index.ts
import { Injectable, NestMiddleware } from '@nestjs/common';

import { Request, Response, NextFunction } from 'express';

@Injectable()
export class Logger implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log('这个是中间件函数的处理逻辑');
    // res.send('Hello World！我被拦截了！);
    next();
  }
}

```

### 配置中间件

```
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(Logger).forRoutes('/')
  }
}
```

## 拦截器



## 库-config

安装依赖

```
pnpm add @nestjs/config --filter service
pnpm add -D joi --filter service # 用于env校验
```






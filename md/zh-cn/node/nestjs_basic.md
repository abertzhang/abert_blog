---
title: NestJS 框架学习文档
create:2026-10-22
update:2026-10-22
category:backend
tags:[node,nestjs,backend,framework,typescript,dependency-injection,decorator]
summary:NestJS 框架从基础到进阶的完整学习文档（基于 NestJS 12），覆盖设计哲学、CLI 与项目结构、Module/Controller/Provider/DI、DTO 与 ValidationPipe、Pipe/Guard/Interceptor/ExceptionFilter/Middleware 全套 AOP、自定义 Provider 与作用域、动态模块、生命周期钩子、Config/数据库(TypeORM)/JWT 认证/缓存/调度/WebSocket/微服务/日志/测试，每节均含可直接运行的示例
keywords:[node,nestjs,backend,framework,typescript,dependency-injection,decorator,module,controller]
top:1
copyright:true
---

# NestJS 框架学习文档

> 适用版本：**NestJS 12**（2026-08 发布，首个 ESM-first 大版本，需 Node ≥ 20.19 或 ≥ 22.12；NestJS 11 仍被广泛使用，本文示例在 v11/v12 均可运行）。
> 本文定位「基础 → 进阶 → 高阶」的完整学习/速查手册，覆盖 NestJS 全部核心概念与 AOP 切面，每节都配 TypeScript 示例。
> 前置：建议先读 [node00_basic.md](./node00_basic.md) 掌握 Node.js 基础与装饰器语法。NestJS 是构建在 Node.js 之上的**渐进式服务端框架**，底层默认 Express（也可切 Fastify）。

---

## 目录

- [1. NestJS 是什么与设计哲学](#1-nestjs-是什么与设计哲学)
- [2. 安装与 CLI](#2-安装与-cli)
- [3. 第一个应用与启动流程](#3-第一个应用与启动流程)
- [4. 模块 Module](#4-模块-module)
- [5. 控制器 Controller](#5-控制器-controller)
- [6. 服务与依赖注入](#6-服务与依赖注入)
- [7. DTO 与数据校验](#7-dto-与数据校验)
- [8. 管道 Pipe](#8-管道-pipe)
- [9. 守卫 Guard](#9-守卫-guard)
- [10. 拦截器 Interceptor](#10-拦截器-interceptor)
- [11. 异常过滤器 Exception Filter](#11-异常过滤器-exception-filter)
- [12. 中间件 Middleware](#12-中间件-middleware)
- [13. 自定义 Provider](#13-自定义-provider)
- [14. 作用域 Scope](#14-作用域-scope)
- [15. 动态模块 Dynamic Module](#15-动态模块-dynamic-module)
- [16. 生命周期钩子](#16-生命周期钩子)
- [17. 配置管理 @nestjs/config](#17-配置管理-nestjsconfig)
- [18. 数据库集成（TypeORM）](#18-数据库集成typeorm)
- [19. 认证与授权（JWT）](#19-认证与授权jwt)
- [20. 缓存 @nestjs/cache-manager](#20-缓存-nestjscache-manager)
- [21. 任务调度 @nestjs/schedule](#21-任务调度-nestjsschedule)
- [22. WebSocket 实时通信](#22-websocket-实时通信)
- [23. 微服务 Microservices](#23-微服务-microservices)
- [24. 日志 Logger](#24-日志-logger)
- [25. 测试](#25-测试)
- [26. 常见坑与最佳实践](#26-常见坑与最佳实践)
- [27. 参考文档](#27-参考文档)

---

## 1. NestJS 是什么与设计哲学

NestJS 是一个用于构建**高效、可靠、可扩展** Node.js 服务端应用的渐进式框架。它的核心特征：

- **TypeScript 优先**（也支持纯 JS），强类型带来更好的可维护性。
- **模块化（Module）**：应用由若干自包含模块组成，边界清晰。
- **依赖注入（DI）**：内置 IoC 容器，组件通过构造函数声明依赖，可测试、可替换。
- **装饰器驱动**：用 `@Controller`、`@Get`、`@Injectable` 等声明式地把元数据与类绑定。
- **AOP 切面**：Pipe / Guard / Interceptor / Exception Filter / Middleware 五类切面横切请求生命周期，职责分离。

```
请求 → Middleware → Guard → Interceptor(前) → Pipe → Controller/Service → Interceptor(后) → ExceptionFilter(异常时)
```

> 一句话：**NestJS = Angular 的组织思想 + Spring 的 DI 理念 + Node 的运行时**。它不重新发明 HTTP，而是在 Express/Fastify 之上提供企业级结构。

---

## 2. 安装与 CLI

```bash
# 全局安装 CLI
npm i -g @nestjs/cli
# 或 pnpm / yarn
pnpm add -g @nestjs/cli

# 新建项目（交互式：选包管理器、HTTP 平台）
nest new my-app
cd my-app

# 常用脚本
npm run start        # 生产构建后启动
npm run start:dev    # 开发热更新（最常用）
npm run start:debug  # 调试模式
npm run build        # 编译到 dist/
npm run test         # 单元测试
npm run test:e2e     # 端到端测试
```

```bash
# 用 CLI 生成骨架代码（大幅提升效率）
nest g module users      # 生成 users 模块
nest g controller users  # 生成控制器
nest g service users     # 生成服务（provider）
nest g resource users    # 一次性生成 CRUD 全套（module/controller/service/entity/dto）
```

> NestJS 12 起 CLI 已重写为 ESM，新增 `nest upgrade`（自动把项目迁到 v12）与 `nest deploy`（部署到 Mau 云）。新建项目会询问**生成 CommonJS 还是 ESM** 工程。

---

## 3. 第一个应用与启动流程

```typescript
// src/main.ts —— 应用入口
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
  console.log("http://localhost:3000");
}
bootstrap();
```

```typescript
// src/app.module.ts —— 根模块
import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

```typescript
// src/app.controller.ts
import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
```

```typescript
// src/app.service.ts
import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  getHello(): string {
    return "Hello Nest!";
  }
}
```

启动流程：`main.ts` 调用 `NestFactory.create(AppModule)` → 框架**扫描模块树、解析依赖、实例化 Provider、绑定路由** → 监听端口。整个过程由 IoC 容器自动装配。

---

## 4. 模块 Module

模块是 NestJS 的**组织单元**，用 `@Module` 声明元数据。

```typescript
import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { UserRepository } from "./user.repository";

@Module({
  imports: [],            // 引入其它模块（其导出的 provider 可用于本模块）
  controllers: [UsersController], // 本模块注册的控制器
  providers: [UsersService, UserRepository], // 本模块实例化的 provider
  exports: [UsersService], // 把哪些 provider 暴露给导入本模块的模块
})
export class UsersModule {}
```

- **封装性**：未 `exports` 的 provider 仅模块内部可见。
- **共享模块**：默认模块是「单例 + 局部」，需 `exports` 才能让别的模块用。
- **全局模块**：加 `@Global()` 装饰器后，全应用可直接注入，无需 `imports`（谨慎使用，常用于配置/数据库模块）。

```typescript
import { Global, Module } from "@nestjs/common";

@Global()
@Module({ providers: [ConfigService], exports: [ConfigService] })
export class ConfigModule {}
```

> 规则：模块间的 provider 复用靠 `exports` + `imports`；跨应用通用能力（Config/DB）才用 `@Global`。

---

## 5. 控制器 Controller

控制器接收请求、调用服务、返回响应。路由由**类前缀 + 方法装饰器**拼接。

```typescript
import {
  Controller, Get, Post, Put, Delete, Patch, Param, Query, Body,
  Headers, HttpCode, Header, Redirect, Version,
} from "@nestjs/common";

@Controller("cats")            // 路径前缀 /cats
export class CatsController {
  @Get()                       // GET /cats?limit=10
  findAll(@Query("limit") limit: string) {
    return `返回前 ${limit ?? 20} 只猫`;
  }

  @Get(":id")                  // GET /cats/42
  findOne(@Param("id") id: string) {
    return `cat ${id}`;
  }

  @Post()                      // POST /cats
  @HttpCode(201)               // 自定义状态码（默认 201 对 POST）
  create(@Body() body: any, @Headers("authorization") auth: string) {
    return { created: body, auth };
  }

  @Put(":id")                  // PUT /cats/42
  update(@Param("id") id: string, @Body() body: any) {
    return `更新 ${id}`;
  }

  @Delete(":id")               // DELETE /cats/42
  remove(@Param("id") id: string) {
    return `删除 ${id}`;
  }

  @Patch(":id")                // PATCH /cats/42（部分更新）
  patch(@Param("id") id: string) { return `部分更新 ${id}`; }

  @Get("go") @Redirect("https://nestjs.com") // 重定向
  go() { return { url: "https://nestjs.com" }; }
}
```

**路由版本**：NestJS 支持 URI / Header / Media Type 三种版本策略。

```typescript
// main.ts 启用版本（默认 URI：/v1/cats）
app.enableVersioning({ type: VersioningType.URI });

@Controller({ path: "cats", version: "1" })
export class CatsV1Controller {}

@Version("2") @Get("cats") findV2() {} // 或方法级 @Version
```

---

## 6. 服务与依赖注入

`@Injectable()` 标记的类是 **provider**，由容器实例化并注入到依赖它的类中。

```typescript
import { Injectable, Inject } from "@nestjs/common";

@Injectable()
export class CatsService {
  private readonly cats: string[] = [];
  create(cat: string) { this.cats.push(cat); }
  findAll() { return this.cats; }
}
```

```typescript
import { Controller, Get, Post, Body } from "@nestjs/common";
import { CatsService } from "./cats.service";

@Controller("cats")
export class CatsController {
  // 构造函数注入（推荐，支持 readonly 与类型推导）
  constructor(private readonly catsService: CatsService) {}

  @Post() create(@Body("name") name: string) {
    this.catsService.create(name);
    return { ok: true };
  }
  @Get() findAll() { return this.catsService.findAll(); }
}
```

**循环依赖**：A↔B 互相依赖时，用 `forwardRef` 打破。

```typescript
@Injectable()
export class AService {
  constructor(@Inject(forwardRef(() => BService)) private b: BService) {}
}
```

> DI 是 NestJS 的基石：**面向接口编程、运行时可替换、测试可 mock**。所有业务代码都应放进 `@Injectable()` 的 provider，而非控制器里直接写逻辑。

---

## 7. DTO 与数据校验

**DTO（Data Transfer Object）** 定义「接口契约」。配合 `class-validator` + `ValidationPipe` 实现入参校验（NestJS 12 同时新增 Standard Schema 校验，class-validator 仍完全支持）。

```bash
npm i class-validator class-transformer
```

```typescript
// dto/create-cat.dto.ts
import { IsString, IsInt, Min, Max, MinLength, IsOptional } from "class-validator";

export class CreateCatDto {
  @IsString() @MinLength(1)
  name: string;

  @IsInt() @Min(0) @Max(30)
  age: number;

  @IsOptional() @IsString()
  breed?: string;
}
```

```typescript
// main.ts 全局注册校验管道（推荐）
import { ValidationPipe } from "@nestjs/common";
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,        // 剥离未声明属性（防多余字段）
  forbidNonWhitelisted: true, // 出现多余字段直接 400
  transform: true,        // 自动按 DTO 类型转换（如 string→number）
}));
```

```typescript
@Post()
create(@Body() dto: CreateCatDto) { // 校验失败自动返回 400 + 错误明细
  return this.catsService.create(dto);
}
```

> `transform: true` 很关键：它让 `@Query('limit') limit: number` 这类**类型转换**生效（否则 query 永远是字符串）。

---

## 8. 管道 Pipe

Pipe 在**方法参数被控制器接收前**对数据做**转换或校验**。

| 内置管道 | 作用 |
|----------|------|
| `ValidationPipe` | 按 DTO 校验（上节） |
| `ParseIntPipe` | 转 number，失败抛 400 |
| `ParseBoolPipe` | 转 boolean |
| `ParseArrayPipe` | 转数组 |
| `ParseEnumPipe` | 限定枚举值 |
| `ParseUUIDPipe` | 校验 UUID 格式 |
| `DefaultValuePipe` | 提供默认值 |
| `ParseFilePipe` | 文件校验 |

```typescript
@Get(":id")
findOne(
  @Param("id", ParseIntPipe) id: number,           // 字符串 → 数字
  @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
) {
  return { id, page }; // id 已是 number
}
```

```typescript
// 自定义管道：实现 PipeTransform 接口
import { PipeTransform, ArgumentMetadata, BadRequestException } from "@nestjs/common";

export class ParsePositiveIntPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num <= 0) {
      throw new BadRequestException("id 必须是正整数");
    }
    return num;
  }
}
```

> 管道可**局部**（`@UsePipes(...)`）或**全局**（`useGlobalPipes`）绑定；校验类与转换类都走它，是「干净入参」的第一道关。

---

## 9. 守卫 Guard

Guard 决定**请求是否被放行**，常用于鉴权/角色校验。在 Pipe 之前执行。

```typescript
import { Injectable, CanActivate, ExecutionContext, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

export const ROLES_KEY = "roles";
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),       // 方法级元数据
      context.getClass(),         // 类级元数据
    ]);
    if (!requiredRoles) return true; // 无角色要求则放行

    const request = context.switchToHttp().getRequest();
    const user = request.user;   // 由 AuthGuard 在之前注入
    return requiredRoles.some((role) => user?.roles?.includes(role));
  }
}
```

```typescript
@Roles("admin")                  // 自定义装饰器标记所需角色
@UseGuards(AuthGuard, RolesGuard) // 链式守卫，按顺序执行
@Get("admin")
adminOnly() { return "仅管理员可见"; }
```

> `ExecutionContext` 是守卫的核心：通过 `switchToHttp()`/`switchToWs()`/`switchToRpc()` 适配 HTTP / WebSocket / 微服务三种上下文，故守卫可跨传输复用。

---

## 10. 拦截器 Interceptor

Interceptor 能**拦截方法调用前后**，用于响应变换、缓存、日志、超时、异常捕获。

```typescript
import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map, tap } from "rxjs/operators";

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // 调用 next.handle() 拿到「控制器返回值的 Observable」
    return next.handle().pipe(
      map((data) => ({ code: 0, msg: "ok", data })), // 统一响应信封
    );
  }
}
```

```typescript
// 超时拦截器（5 秒未响应则抛错）
import { timeout, catchError } from "rxjs/operators";
import { throwError } from "rxjs";
import { RequestTimeoutException } from "@nestjs/common";

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(5000),
      catchError(() => throwError(() => new RequestTimeoutException())),
    );
  }
}
```

```typescript
@UseInterceptors(TransformInterceptor, TimeoutInterceptor) // 局部绑定
@Get()
findAll() { return this.service.findAll(); }
```

> 内置 `CacheInterceptor`（配合缓存模块）、`ClassSerializerInterceptor`（按 `@Exclude()` 序列化脱敏）是最常用的两个拦截器。

---

## 11. 异常过滤器 Exception Filter

过滤器**捕获未处理异常**，统一转换成响应格式。NestJS 自带一套 HTTP 异常类。

```typescript
import {
  ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus,
} from "@nestjs/common";

@Catch(HttpException) // 只捕获 HttpException（也可 @Catch() 捕获全部）
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status = exception.getStatus?.() ?? HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json({
      code: status,
      path: request.url,
      message: exception.message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

```typescript
// 内置异常（直接 throw，自动映射状态码）
import { NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";

@Get(":id")
findOne(@Param("id") id: string) {
  const cat = this.service.findOne(id);
  if (!cat) throw new NotFoundException(`cat ${id} 不存在`);
  return cat;
}

// 自定义业务异常
export class BusinessException extends HttpException {
  constructor(msg: string) {
    super({ code: 1001, msg }, HttpStatus.BAD_REQUEST);
  }
}
```

```typescript
// 绑定：局部 @UseFilters(HttpExceptionFilter) / 全局 app.useGlobalFilters(...)
```

> 执行顺序：Guard → Interceptor(前) → Pipe → Controller → Interceptor(后)；**任意环节抛异常都会被 Exception Filter 兜底**，所以不必在每个方法里 try/catch。

---

## 12. 中间件 Middleware

中间件在**路由处理之前**运行，可访问请求/响应、调用 `next()` 传递控制权。

```typescript
import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(`${req.method} ${req.originalUrl} ${new Date().toISOString()}`);
    next(); // 必须调用，否则请求挂起
  }
}
```

```typescript
// 在模块里用 configure 消费中间件
import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";

@Module({})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes("cats");          // 仅作用于 /cats
    // .exclude({ path: "cats", method: RequestMethod.GET }) // 排除 GET
    // .forRoutes({ path: "cats", method: RequestMethod.ALL });
  }
}

// 函数式中间件（无依赖时更简单）
export function logger(req, res, next) { console.log(req.url); next(); }
```

> 也可 `app.use(logger)` 全局注册。中间件适合做**请求日志、CORS、压缩、体解析**等横切关注。

---

## 13. 自定义 Provider

NestJS 用**多种 Provider 写法**应对不同场景，统一写进 `providers` 数组。

```typescript
import { Inject, Injectable } from "@nestjs/common";

// 1) 类 provider（最常用，token 就是类本身）
@Injectable() class ConfigService {}

// 2) useClass：按条件替换实现（适合不同环境/测试 mock）
const configProvider = {
  provide: ConfigService,
  useClass: process.env.NODE_ENV === "test" ? TestConfigService : ConfigService,
};

// 3) useValue：注入常量/实例
const configValue = { provide: "CONFIG", useValue: { port: 3000 } };

// 4) useFactory：依赖其它 provider 动态创建（如读取配置建连接）
const dbProvider = {
  provide: "DATA_SOURCE",
  useFactory: (cfg: any) => new DataSource(cfg.dbUrl), // 可异步
  inject: ["CONFIG"],
};

// 5) useExisting：给同一实例起别名
const alias = { provide: "AliasService", useExisting: RealService };

// 注入自定义 token
@Injectable()
class AppService {
  constructor(
    @Inject("CONFIG") private config: any,
    @Inject("DATA_SOURCE") private ds: any,
  ) {}
}
```

> `useFactory` + `inject` 是**配置驱动创建资源**（数据库连接、HTTP 客户端）的标准模式。

---

## 14. 作用域 Scope

Provider 默认是**单例（DEFAULT）**，但可改为**请求级（REQUEST）**或**瞬态（TRANSIENT）**。

```typescript
import { Injectable, Scope } from "@nestjs/common";

@Injectable({ scope: Scope.REQUEST })  // 每个请求新建实例（可存请求上下文）
export class RequestScopedService {}

@Injectable({ scope: Scope.TRANSIENT }) // 每次注入都新建实例
export class TransientService {}
```

| 作用域 | 生命周期 | 适用 |
|--------|----------|------|
| `DEFAULT`（单例） | 整个应用一个实例 | 绝大多数场景（默认） |
| `REQUEST` | 每个请求一个实例 | 需承载 per-request 状态（如当前用户） |
| `TRANSIENT` | 每次注入新建 | 无状态工具、需隔离的场景 |

> **注意**：REQUEST/TRANSIENT 会禁用一部分性能优化（无法走单例缓存），仅在确实需要隔离状态时使用；单例 provider 千万不能注入请求级 provider（会破坏生命周期）。

---

## 15. 动态模块 Dynamic Module

动态模块让模块**接收配置参数**后再决定如何构建 provider，是 `ConfigModule`、`TypeOrmModule` 等的实现原理。

```typescript
import { DynamicModule, Module } from "@nestjs/common";

export interface DbModuleOptions { url: string; }

@Module({})
export class DbModule {
  static forRoot(options: DbModuleOptions): DynamicModule {
    return {
      module: DbModule,
      providers: [{ provide: "DB_URL", useValue: options.url }],
      exports: ["DB_URL"],
      global: true,            // 可选：注册为全局
    };
  }

  // 常见两种命名：forRoot（全局配置）/ forFeature（按需导入实体）
  static forFeature(entities: any[]): DynamicModule {
    return {
      module: DbModule,
      providers: entities.map((e) => ({ provide: e, useClass: e })),
      exports: entities,
    };
  }
}
```

```typescript
// 使用方
@Module({
  imports: [DbModule.forRoot({ url: process.env.DB_URL })],
})
export class AppModule {}
```

> 约定俗成：`forRoot` 做**一次性全局配置**，`forFeature` 做**按模块引入资源**（如注册某张表的 Repository）。

---

## 16. 生命周期钩子

应用启动/关闭时框架会调用这些接口，用于初始化与清理。

```typescript
import {
  Injectable, OnModuleInit, OnApplicationBootstrap,
  OnModuleDestroy, BeforeApplicationShutdown, OnApplicationShutdown,
} from "@nestjs/common";

@Injectable()
export class AppService
  implements
    OnModuleInit, OnApplicationBootstrap,
    OnModuleDestroy, BeforeApplicationShutdown, OnApplicationShutdown {
  onModuleInit() { console.log("模块初始化后"); }
  onApplicationBootstrap() { console.log("应用监听前"); }
  onModuleDestroy() { console.log("信号触发，模块销毁前"); }
  beforeApplicationShutdown(signal?: string) { console.log("关闭前:", signal); }
  onApplicationShutdown(signal?: string) { console.log("已关闭:", signal); }
}
```

> 适合做：连接数据库、预热缓存、注册信号量、优雅关闭连接。`OnModuleInit` 最常用（启动后建连）。

---

## 17. 配置管理 @nestjs/config

```bash
npm i @nestjs/config
```

```typescript
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,                 // 全局可用，无需重复 import
      envFilePath: [".env", ".env.local"],
    }),
  ],
})
export class AppModule {}
```

```typescript
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AppService {
  constructor(private config: ConfigService) {}
  getPort() {
    return this.config.get<number>("PORT", 3000); // 取环境变量，带默认值
  }
}
```

> NestJS 12 起 `@nestjs/config` 从 Joi 专属校验迁移到 **Standard Schema**；保留 Joi 需升级到 Joi v18+。新项目可直接用 Zod/Valibot 等 Standard Schema 做配置校验。

---

## 18. 数据库集成（TypeORM）

```bash
npm i @nestjs/typeorm typeorm pg
```

```typescript
// 实体 entity
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class Cat {
  @PrimaryGeneratedColumn() id: number;
  @Column() name: string;
  @Column() age: number;
}
```

```typescript
// 模块：forRoot 建连接，forFeature 注册实体 → 注入 Repository
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Cat } from "./cat.entity";
import { CatsService } from "./cats.service";
import { CatsController } from "./cats.controller";

@Module({
  imports: [
    TypeOrmModule.forRoot({ type: "postgres", host: "localhost", port: 5432,
      username: "postgres", password: "pass", database: "cats", entities: [Cat] }),
    TypeOrmModule.forFeature([Cat]),
  ],
  controllers: [CatsController],
  providers: [CatsService],
})
export class CatsModule {}
```

```typescript
// 服务：注入 Repository 做 CRUD
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Cat } from "./cat.entity";

@Injectable()
export class CatsService {
  constructor(@InjectRepository(Cat) private repo: Repository<Cat>) {}
  create(dto: Partial<Cat>) { return this.repo.save(dto); }
  findAll() { return this.repo.find(); }
  findOne(id: number) { return this.repo.findOneBy({ id }); }
  async remove(id: number) { await this.repo.delete(id); }
}
```

> 其它 ORM：`@nestjs/prisma`（Prisma，类型安全、现代首选）、`@nestjs/mongoose`（MongoDB）。选型看团队偏好；模式一致——都是「Module 注册 + 注入客户端/Repository」。

---

## 19. 认证与授权（JWT）

```bash
npm i @nestjs/jwt @nestjs/passport passport passport-jwt
npm i -D @types/passport-jwt
```

```typescript
// auth.module.ts
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";

@Module({
  imports: [JwtModule.register({ global: true, secret: "CHANGE_ME", signOptions: { expiresIn: "1h" } })],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
```

```typescript
// auth.service.ts：登录签发 token
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AuthService {
  constructor(private jwt: JwtService) {}
  login(username: string, pwd: string) {
    if (username !== "admin" || pwd !== "123456") {
      throw new UnauthorizedException("账号或密码错误");
    }
    const token = this.jwt.sign({ sub: username, username }); // 载荷
    return { access_token: token };
  }
  verify(token: string) { return this.jwt.verify(token); }
}
```

```typescript
// jwt-auth.guard.ts：校验请求里的 Bearer token
import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const auth = req.headers.authorization?.split(" ")[1];
    if (!auth) return false;
    try { req.user = this.jwt.verify(auth); return true; }
    catch { return false; }
  }
}
```

```typescript
// 受保护路由
@UseGuards(JwtAuthGuard)
@Get("profile")
getProfile(@Request() req) { return req.user; }
```

> 生产应将 `secret` 放到环境变量（配合 §17 ConfigModule），并使用 **RSA 非对称密钥**（私钥签发、公钥验证）而非对称字符串密钥。

---

## 20. 缓存 @nestjs/cache-manager

```bash
npm i @nestjs/cache-manager cache-manager
```

```typescript
import { CacheModule } from "@nestjs/cache-manager";
import { Module } from "@nestjs/common";

@Module({
  imports: [CacheModule.register({ ttl: 5000, isGlobal: true })], // 5 秒 TTL
})
export class AppModule {}
```

```typescript
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { Inject, Injectable } from "@nestjs/common";

@Injectable()
export class CatsService {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  async get(id: string) {
    const hit = await this.cache.get(`cat:${id}`);
    if (hit) return hit;
    const data = await this.repo.findOne(id);
    await this.cache.set(`cat:${id}`, data, 10000); // 10 秒
    return data;
  }
}
```

```typescript
// 或用内置 CacheInterceptor 自动缓存 GET 响应（配合 @CacheKey/@CacheTTL）
@UseInterceptors(CacheInterceptor)
@CacheKey("all_cats")
@CacheTTL(30)
@Get()
findAll() { return this.service.findAll(); }
```

---

## 21. 任务调度 @nestjs/schedule

```bash
npm i @nestjs/schedule
```

```typescript
import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";

@Module({ imports: [ScheduleModule.forRoot()] })
export class AppModule {}
```

```typescript
import { Injectable } from "@nestjs/common";
import { Cron, Interval, Timeout, CronExpression } from "@nestjs/schedule";

@Injectable()
export class TasksService {
  @Cron(CronExpression.EVERY_DAY_AT_NOON) // 每天中午
  handleCron() { console.log("定时任务：每天 noon"); }

  @Interval(10000)                        // 每 10 秒
  handleInterval() { console.log("每 10 秒一次"); }

  @Timeout(5000)                          // 启动 5 秒后执行一次
  handleTimeout() { console.log("启动 5 秒后"); }
}
```

---

## 22. WebSocket 实时通信

```bash
npm i @nestjs/websockets @nestjs/platform-socket.io
```

```typescript
import {
  WebSocketGateway, SubscribeMessage, MessageBody,
  ConnectedSocket, WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@WebSocketGateway({ cors: true }) // 默认端口与 HTTP 同（3000）
export class ChatGateway {
  @WebSocketServer() server: Server;

  @SubscribeMessage("message") // 监听客户端 emit('message')
  handleMessage(
    @MessageBody() body: { text: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.server.emit("message", { echo: body.text, from: client.id }); // 广播
    return { ok: true };
  }
}
```

```typescript
// 网关也是 provider，可注入服务、用 Guard/Pipe/Interceptor
@WebSocketGateway()
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  handleConnection(client: Socket) { console.log("连接:", client.id); }
  handleDisconnect(client: Socket) { console.log("断开:", client.id); }
}
```

> WebSocket 网关复用 HTTP 的 Guard/Pipe/Interceptor，但其 `ExecutionContext` 需 `switchToWs()` 适配。

---

## 23. 微服务 Microservices

```bash
npm i @nestjs/microservices
```

```typescript
// math.service.ts（微服务侧）
import { Controller } from "@nestjs/common";
import { MessagePattern, EventPattern } from "@nestjs/microservices";

@Controller()
export class MathController {
  @MessagePattern({ cmd: "sum" })      // 请求-响应
  sum(data: number[]): number { return data.reduce((a, b) => a + b, 0); }

  @EventPattern("log")                  // 事件（无需响应）
  log(data: any) { console.log("事件:", data); }
}
```

```typescript
// main.ts 启动为微服务（TCP 传输）
import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.TCP,
    options: { host: "localhost", port: 8888 },
  });
  await app.listen();
}
bootstrap();
```

```typescript
// 调用方：ClientProxy（在 HTTP 服务里注入）
@Injectable()
export class AppService {
  constructor(@Inject("MATH") private client: ClientProxy) {}
  callSum(nums: number[]) {
    return this.client.send({ cmd: "sum" }, nums); // 返回 Observable
    // this.client.emit('log', { msg: 'hi' });    // 发事件
  }
}
```

> 还支持 Redis / NATS / MQTT / gRPC / Kafka 等 `Transport`。同一应用可用 `connectMicroservice` 同时跑 HTTP + 微服务（混合应用）。

---

## 24. 日志 Logger

```typescript
import { Controller, Get, Logger } from "@nestjs/common";

@Controller("cats")
export class CatsController {
  private readonly logger = new Logger(CatsController.name); // 自带类名上下文

  @Get()
  findAll() {
    this.logger.log("查询所有猫");   // info
    this.logger.warn("慢查询预警");  // warn
    this.logger.error("出错了", err.stack); // error
    return [];
  }
}
```

```typescript
// 自定义日志（实现 LoggerService 接口，可接 Winston/Pino）
import { Injectable, LoggerService, Scope } from "@nestjs/common";

@Injectable({ scope: Scope.TRANSIENT })
export class MyLogger implements LoggerService {
  log(msg: any) { console.log(`[MY] ${msg}`); }
  error(msg: any, trace?: string) { console.error(`[MY][ERR] ${msg}`, trace); }
  warn(msg: any) { console.warn(`[MY][WARN] ${msg}`); }
}
// 全局替换：app.useLogger(new MyLogger())
```

> 生产推荐接入 **Winston / Pino**（高性能、结构化日志）。用拦截器统一记录请求耗时与结果（见 §10）。

---

## 25. 测试

```typescript
// cats.service.spec.ts（单元测试，jest/vitest）
import { Test, TestingModule } from "@nestjs/testing";
import { CatsService } from "./cats.service";

describe("CatsService", () => {
  let service: CatsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CatsService], // 只装配所需 provider；依赖可 mock
    }).compile();

    service = module.get(CatsService);
  });

  it("应被定义", () => {
    expect(service).toBeDefined();
  });
});
```

```typescript
// cats.e2e-spec.ts（端到端，supertest 真实打 HTTP）
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "./../src/app.module";

describe("CatsController (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it("/cats (GET)", () => {
    return request(app.getHttpServer()).get("/cats").expect(200);
  });

  afterAll(async () => { await app.close(); });
});
```

> 测试三件套：`Test.createTestingModule` 隔离装配、`module.get()` 取实例、依赖用 `provide` 替换成 mock。NestJS 12 中 ESM 项目默认用 **Vitest**，CommonJS 项目仍用 **Jest**。

---

## 26. 常见坑与最佳实践

### 26.1 高频坑

1. **把业务逻辑写进 Controller**：Controller 应只做「接收参数 → 调服务 → 返回」，逻辑放 Service。
2. **忘记 `transform: true`**：`@Query('limit') limit: number` 实际仍是字符串，导致类型/运算出错。
3. **@Global 滥用**：全局模块让依赖关系隐式化，非通用能力（Config/DB 之外）尽量显式 import。
4. **请求级 provider 注入到单例**：破坏生命周期，导致状态串号或报错。
5. **循环依赖不处理**：A↔B 必须用 `forwardRef` 双向包裹。
6. **校验用 `forbidNonWhitelisted` 却前端发了多余字段**：联调 400，需对齐 DTO。
7. **JWT secret 写死在代码**：应走环境变量；生产用非对称密钥。
8. **拦截器返回非 Observable**：`next.handle()` 返回 Observable，手动返回普通值会报错。
9. **异常在 filter 外被 try/catch 吞掉**：要么不捕获（交给全局 filter 统一格式），要么重新 throw。
10. **Provider 未注册**：注入的 service 必须出现在某模块的 `providers` 且模块被正确 import，否则 `undefined` 依赖报错。

### 26.2 最佳实践

- **分层清晰**：Controller（路由）→ Service（业务）→ Repository（数据）。
- **全局管道/守卫/拦截器/过滤器**在 `main.ts` 统一注册，保证全站一致。
- **DTO 先行**：所有入参/出参用 class + 装饰器描述契约，开启 `whitelist`/`transform`。
- **配置走 ConfigModule + `.env`**，密钥绝不入库。
- **可测试性**：依赖通过构造函数注入，测试时用 mock provider 替换。
- **生命周期**：连接资源放 `onModuleInit`，关闭放 `onApplicationShutdown`（优雅停机）。
- **版本策略**：对外 API 用 `enableVersioning` 做版本隔离，避免破坏性升级。

---

## 27. 参考文档

- [NestJS 官方文档（最新）](https://docs.nestjs.com/)
- [NestJS 官方首页](https://nestjs.com/)
- [NestJS GitHub 仓库](https://github.com/nestjs/nest)
- [NestJS 12 发布说明](https://nestjs.com/blog/nestjs-12-is-now-available)
- [First steps（快速上手）](https://docs.nestjs.com/first-steps)
- [Controllers 控制器](https://docs.nestjs.com/controllers)
- [Providers 与依赖注入](https://docs.nestjs.com/providers)
- [Modules 模块](https://docs.nestjs.com/modules)
- [Pipes 管道](https://docs.nestjs.com/pipes)
- [Guards 守卫](https://docs.nestjs.com/guards)
- [Interceptors 拦截器](https://docs.nestjs.com/interceptors)
- [Exception Filters 异常过滤器](https://docs.nestjs.com/exception-filters)
- [Middlewares 中间件](https://docs.nestjs.com/middleware)
- [Custom providers 自定义 Provider](https://docs.nestjs.com/fundamentals/custom-providers)
- [Injection scopes 作用域](https://docs.nestjs.com/fundamentals/injection-scopes)
- [Dynamic Modules 动态模块](https://docs.nestjs.com/fundamentals/dynamic-modules)
- [Lifecycle events 生命周期](https://docs.nestjs.com/fundamentals/lifecycle-events)
- [Configuration 配置（@nestjs/config）](https://docs.nestjs.com/techniques/configuration)
- [Database（TypeORM）](https://docs.nestjs.com/techniques/database)
- [Authentication（JWT/Passport）](https://docs.nestjs.com/security/authentication)
- [Caching（@nestjs/cache-manager）](https://docs.nestjs.com/techniques/caching)
- [Task Scheduling（@nestjs/schedule）](https://docs.nestjs.com/techniques/task-scheduling)
- [WebSockets（@nestjs/websockets）](https://docs.nestjs.com/websockets/gateways)
- [Microservices（@nestjs/microservices）](https://docs.nestjs.com/microservices/basics)
- [Testing 测试](https://docs.nestjs.com/fundamentals/testing)
- [class-validator 校验库](https://github.com/typestack/class-validator)
- [TypeScript 官方](https://www.typescriptlang.org/)

> 说明：本文基于 **NestJS 12**（2026-08 发布，ESM-first 大版本，需 Node ≥ 20.19 或 ≥ 22.12）编写；绝大多数示例在 NestJS 11 同样适用。NestJS 12 的重要变化包括：官方包改为 ESM（旧 CommonJS 项目仍可运行）、新增 **Standard Schema** 校验/序列化（class-validator 工作流仍完全支持）、CLI 重写与 `nest upgrade`/`nest deploy`、新增 `@nestjs/observe` 可观测性 SDK、`@nestjs/config` 改用 Standard Schema 校验（保留 Joi v18+）。具体以官方 [docs](https://docs.nestjs.com/) 与 [迁移指南](https://docs.nestjs.com/migration-guide) 为准。

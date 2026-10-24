---
title: OpenShip 使用文档
create:2026-10-08
update:2026-10-21
category:other
cover:https://img-common.aknot.uk/cover/land-18.jpg
tags:[openship,shipping,logistics,tools,api]
summary:OpenShip 使用文档，覆盖快递/物流对接、API 调用与集成
keywords:[openship,shipping,logistics,tracking,api]
top:1
copyright:true
---

# OpenShip 使用文档（详细版）

> **OpenShip**（openship.io）是一个开源、可自托管的**应用部署平台**，内置 CI/CD。
> 它定位为 **Vercel / Coolify / Dokploy 的开源替代品**：把 Git 仓库或本地文件夹指向它，它会自动检测技术栈 → 构建 → 部署 → 配域名和 HTTPS，并支持日志、指标与一键回滚。
> 协议：**Apache-2.0**（完全免费、可自托管、无锁定）。

---

## 目录

- [1. 概述](#1-概述)
- [2. 核心概念](#2-核心概念)
- [3. 工作原理（部署链路）](#3-工作原理部署链路)
- [4. 三种部署形态](#4-三种部署形态)
- [5. 安装](#5-安装)
- [6. 运行模式：Compose 与 Bare](#6-运行模式compose-与-bare)
- [7. 快速开始](#7-快速开始)
- [8. 部署你的第一个应用](#8-部署你的第一个应用)
- [9. CLI 命令参考](#9-cli-命令参考)
- [10. 应用配置（域名 / Secrets / 存储）](#10-应用配置域名--secrets--存储)
- [11. 运维操作](#11-运维操作)
- [12. Web 控制面板](#12-web-控制面板)
- [13. 桌面应用](#13-桌面应用)
- [14. Ship SDK / API / MCP](#14-ship-sdk--api--mcp)
- [15. Shell 自动补全](#15-shell-自动补全)
- [16. 与其他平台对比](#16-与其他平台对比)
- [17. 常见问题与排错](#17-常见问题与排错)
- [18. 参考链接](#18-参考链接)

---

## 1. 概述

### 1.1 它是什么

OpenShip 是一个 **"Push 代码即部署"** 的自托管 PaaS：

- 支持 **从 Git 仓库 / 本地文件夹 / 生成文件 / 应用模板** 构建并部署应用；
- 代码**在你的机器上构建**（不在生产服务器上），产出不可变、带版本号的镜像；
- 通过 **SSH** 把镜像流式推送到目标服务器（OpenShip Cloud、你自己的 VPS 或家用服务器）；
- 自动完成：**域名绑定、Let's Encrypt TLS 证书、日志、指标、一键回滚**；
- 在服务器上可托管 **Postgres、Redis、Mail、对象存储** 等附加服务。

### 1.2 核心特性

| 特性 | 说明 |
|---|---|
| **技术栈自动检测** | 自动识别 Node / Next.js / Python / Go / Rust / Docker / Rails / Laravel / Django / Bun，支持 monorepo |
| **本地构建** | 镜像在你机器（或云端）构建，生产服务器只负责运行，绝不编译 |
| **不可变版本** | 每次构建生成 v1/v2/v3… 的不可变产物，可一键回滚 |
| **无 Agent / 无守护进程** | 目标服务器只通过 SSH 接收镜像，不安装任何常驻程序 |
| **自动域名 + SSL** | 自动配域名、自动申请/续期 Let's Encrypt 证书 |
| **三种界面** | CLI、Web 控制面板、桌面 App（Mac / Windows / Linux） |
| **三种形态** | OpenShip Cloud / 自托管 / 混合，随时一键切换 |
| **内置服务** | 可托管 Postgres、Redis、Mail、对象存储、定时任务 |
| **AI 集成** | 支持通过 **MCP** 让 AI Agent 直接触发部署 |
| **开源免费** | Apache-2.0，自托管无任何费用 |

### 1.3 适用场景

- **独立开发者**：一台机器，图省事 → 用桌面 App；
- **团队 / 需要 CI/CD**：自托管服务器（`openship up`），push-to-deploy + 团队权限；
- **不想运维**：直接用 OpenShip Cloud（托管沙箱，零配置）；
- **敏感数据**：把应用部署到自己的服务器，不经过任何第三方。

---

## 2. 核心概念

OpenShip 用几个固定的对象组织所有工作（官方文档称为 Core Concepts）：

| 概念 | 英文 | 说明 |
|---|---|---|
| **组织** | Organization | 拥有项目并管理成员访问权限的顶层单位 |
| **项目** | Project | 持有源码与配置的单元（对应一个 Git 仓库或文件夹） |
| **部署** | Deployment | 项目的一次构建与发布（每次 build+ship 产生一个） |
| **服务** | Service | 项目内部的一个工作负载，例如一个应用或一个数据库 |
| **环境** | Environment | 开发 / 预发布 / 生产等运行环境 |
| **服务器** | Server | 应用实际运行的机器（云、VPS 或家用机） |
| **域名** | Domain | 绑定到部署的对外访问地址 |

> 一句话理解：**组织**里建**项目**，项目每次**部署**产生**服务**，服务跑在**服务器**上并通过**域名**对外提供。

---

## 3. 工作原理（部署链路）

OpenShip 官网上用一个清晰的路径图描述代码从 `git push` 到对外服务的完整链路：

```
git push / CLI / 桌面 App / AI Agent(MCP)
        │
        ▼
 ① Push      任意技术栈，自动检测，支持 branch 环境
        │
        ▼
 ② Build     在你机器（或云端）构建镜像，跑测试，产出不可变、带版本号产物
        │
        ▼
 ③ Ship      通过 SSH 流式推送到目标服务器，以全新容器启动
        │
        ▼
 ④ Wire      自动接好域名、SSL、数据库、Redis、Mail、对象存储（私有网络内）
        │
        ▼
 ⑤ Route     Edge 层终止 TLS，把流量路由到应用
        │
        ▼
 ⑥ Rollback  旧版本保持"温热"，一键回滚，无需重新构建
```

关键设计点：

- **生产机器从不构建**：构建发生在你的机器或云端，服务器只运行镜像；
- **无 Agent / 无黑盒**：目标服务器上不装任何 agent、daemon 或 dashboard；
- **隔离私有网络**：应用与数据库等运行在隔离私有网络，不暴露多余端口；
- **兼容已有反向代理**：可接续你现有的 Traefik / nginx / Caddy 的 :80/:443，切换可逆。

---

## 4. 三种部署形态

同一平台，三种用法，可随时切换。

### 4.1 OpenShip Cloud（托管云）

- 用 OpenShip 官方的云端运行；
- 从你的仓库构建并部署，在**一个控制面板**里管理部署、域名、日志；
- 适合不想运行任何东西、追求零配置的用户。

### 4.2 自托管（Self-hosted，推荐）

- 整个平台跑在你自己的机器上，**完全免费、开源**；
- 支持任意 Linux 机器、任意厂商、任意区域，可随时增加节点；
- 可连接任何 VPS（Hetzner、DigitalOcean、AWS、裸金属）；
- 支持多服务器跨区域分发；
- 目标服务器上无 agent 或 dashboard。

### 4.3 混合（Mix and match）

- 云端用于突发流量，你自己的服务器用于敏感数据；
- **一个控制面板**管理两者；
- 应用是普通容器、服务是标准镜像，在 Cloud 与自托管之间**一键迁移**，无需重新构建或重写。

> **切换**：应用都是普通容器、服务都是标准镜像，因此 Cloud ⇄ 自托管可以随时点一下完成，无退出成本。

---

## 5. 安装

### 5.1 前置要求

| 项目 | 要求 |
|---|---|
| Node.js | **22+**（用 npm 安装时）；系统低于 22 可用官方脚本自动携带 Node |
| 操作系统 | macOS / Linux / Windows；ARM 与 x86 均支持 |
| Docker（可选） | Linux 上启用 Compose 模式需要 Docker |
| 一个服务器（可选） | 自托管/部署目标：任意可通过 SSH 访问的 Linux 机器 |

### 5.2 安装方式一：官方安装脚本（推荐，自动带 Node）

```bash
curl -fsSL https://get.openship.io | sh
```

- 如果你的系统 Node 版本低于 22，脚本会**自带一个 Node**，不干扰你的系统；
- 安装完成后可用 `openship --version` 验证。

### 5.3 安装方式二：npm 全局安装

```bash
npm i -g openship
```

- 需要你已经安装 **Node 22+**；
- 这种安装运行在你已有的 Node 上。

> 国内网络较慢时可先切换 npm 镜像再安装：
> ```bash
> npm config set registry https://registry.npmmirror.com
> npm i -g openship
> ```

### 5.4 安装方式三：桌面应用（Solo 推荐）

直接下载对应平台的安装包（链接始终指向最新 release）：

| 平台 | 文件 |
|---|---|
| macOS（Apple Silicon） | `Openship-arm64.dmg` |
| macOS（Intel） | `Openship-x64.dmg` |
| Windows | `Openship-win32-x64.zip` |
| Linux | `Openship.AppImage` |

Linux 运行方式：

```bash
chmod +x Openship.AppImage && ./Openship.AppImage
```

如果已装有 CLI，也可以用 `openship install` 自动拉取并启动桌面应用。

### 5.5 安装开发版（Preview / from-source）

运行直接从源码构建的 CLI（分支、tag 或超前于下一个 release 的 main）：

```bash
curl -fsSL https://get.openship.io/dev | sh            # main（默认）
curl -fsSL https://get.openship.io/dev | OPENSHIP_REF=dev sh   # 指定分支/tag（变量放在 sh 前）
openship-dev                                          # 与 openship 相同的 CLI，但从源码构建
openship-dev update                                   # 拉取最新源码并重新构建
```

> ⚠️ 开发版：
> - 安装为独立的 `openship-dev` 命令，拥有独立的 home（`~/.openship-dev`）与开机服务，**不会触碰生产 `openship` 及其数据**；
> - 需要 **Bun + git**；
> - 是未经校验的开发构建（dashboard 编译需要真实内存/CPU），**不适合生产环境**。

---

## 6. 运行模式：Compose 与 Bare

`openship up` 会根据你的环境**自动选择**运行方式。

### 6.1 Compose 模式（默认，仅 Linux + Docker）

- 通过 Docker Compose 拉起完整栈：**Postgres、Redis、API、Dashboard、容器化的 OpenResty Edge（:80/:443）**；
- 使用已发布的镜像；
- 这个形态**能在这台机器上托管你部署的应用**，并支持自动域名 + Let's Encrypt TLS；
- 强制指定：`--compose`。

### 6.2 Bare 模式（macOS / Windows / 无 Docker 的 Linux）

- 一个轻量进程，内置嵌入式数据库；
- 是一个**常驻的控制平面**，把应用部署到服务器（SSH）或 Cloud，类似桌面 App 但始终在线、需要登录；
- 强制指定：`--bare`。

> 自托管实例**始终要求登录**（向导中创建的第一个 admin 即你的账号）。

---

## 7. 快速开始

安装后的第一步是**决定 OpenShip 本身怎么跑**（控制平面），这一步定了之后其余操作一致。

### 7.1 快速决策表

| 你的情况 | 运行方式 | 应用跑在哪 |
|---|---|---|
| 单机、一人、不想管运维 | **桌面 App** | 通过 SSH 连接的服务器，或 OpenShip Cloud |
| 团队 / 要 push-to-deploy / 想在自有机箱托管应用 | **自托管服务器**（`openship up`） | 本机（Compose 模式），或另一台服务器 / Cloud（Bare 模式） |
| 什么都不想运行 | **OpenShip Cloud** | 托管沙箱，零配置 |

> **单人用户建议用桌面 App**：它只在 App 打开时运行控制平面，不会在常驻服务器上留任何东西、不暴露公网。只有当你需要 **push-to-deploy（CI/CD）、团队访问、或在某台机器托管应用**（这些都需要一个常驻公网端点）时，才需要一个常驻服务器。

### 7.2 单人最快路径：桌面 App

1. 下载对应平台的桌面 App 并打开；
2. 连接一台服务器（SSH）或 OpenShip Cloud；
3. 选择要部署的文件夹/仓库 → 部署。

无需登录、无需终端、无公网暴露。

### 7.3 团队 / 常驻路径：自托管服务器

```bash
# 1. 安装（见第 5 节）
curl -fsSL https://get.openship.io | sh

# 2. 启动交互式向导：创建第一个 admin、配置域名、注册为开机服务
openship

# 3. 之后随时用 openship 重新进入管理
```

跳过向导、直接以 headless / CI 方式启动：

```bash
# 安装并作为后台服务启动（开机自启 + 崩溃自重启）
openship up

# 指定公开域名并托管 dashboard（自动处理 Edge + TLS）
openship up --public-url https://openship.example.com
```

```bash
# 打开 Web 面板
openship open

# 停止服务
openship stop

# 升级
openship update

# 前台附加运行（调试）
openship up --foreground
```

---

## 8. 部署你的第一个应用

进入你的项目目录，做两步即可上线：

```bash
cd your-project
openship init        # 把这个目录关联为一个 OpenShip 项目
openship deploy      # 构建并部署
```

### 8.1 工作流程说明

1. `openship init`：将当前目录链接为一个 **project**；
2. `openship deploy`：自动检测技术栈 → 本地构建镜像 → 生成不可变版本 → SSH 推送到目标 → 启动容器 → 配置域名/SSL；
3. 之后每次 `git push`（配合自托管服务器的 push-to-deploy）会自动构建并部署，支持 branch 环境。

### 8.2 支持的部署来源

- Git 仓库（关联后 push 即部署）
- 本地文件夹
- 生成的文件
- 应用模板（App templates）

---

## 9. CLI 命令参考

> 完整、随版本更新的 CLI 参考见 **openship.io/docs**。以下为常用命令与确认过的用法。

### 9.1 生命周期

| 命令 | 作用 |
|---|---|
| `openship` | 交互式向导：创建 admin、配置域名、安装为开机服务；再运行可管理实例 |
| `openship up` | 安装并以后台服务方式启动（开机自启、崩溃自重启） |
| `openship up --public-url <url>` | 指定公开域名并托管 dashboard（Edge + TLS 自动处理） |
| `openship up --foreground` | 前台附加运行（调试用） |
| `openship up --compose` | 强制 Compose 模式（Linux + Docker） |
| `openship up --bare` | 强制 Bare 模式 |
| `openship open` | 打开 Web 控制面板 |
| `openship stop` | 停止服务 |
| `openship update` | 升级 OpenShip |
| `openship install` | 拉取并启动桌面应用 |

### 9.2 项目部署

| 命令 | 作用 |
|---|---|
| `openship init` | 把当前目录关联为一个项目 |
| `openship deploy` | 构建并部署当前项目 |

### 9.3 Shell 补全

| 命令 | 作用 |
|---|---|
| `openship completion bash` | 输出 bash 补全脚本 |
| `openship completion zsh` | 输出 zsh 补全脚本 |
| `openship completion fish` | 输出 fish 补全脚本 |

---

## 10. 应用配置（域名 / Secrets / 存储）

> 详细配置项见官方 "Application configuration" 文档。

- **域名（Domain）**：为每个部署绑定自定义域名，自动签发/续期 Let's Encrypt 证书；支持不限数量的发送域名；
- **Secrets（机密变量）**：管理环境变量与密钥，通过 CLI / 面板 / 桌面 App 设置，注入到部署容器；
- **存储 / 数据库**：可托管 Postgres、Redis、对象存储；通过 OpenSMTP / REST API 接入邮件（可接 Amazon SES 或任意 SMTP，发件 IP 预热）；
- **Backups / Cron**：内置备份与定时任务。

---

## 11. 运维操作

| 场景 | 操作 |
|---|---|
| 看日志 | CLI / Web 面板 / 桌面 App 流式查看 |
| 看指标 | 面板查看 Metrics |
| 回滚 | 一键回滚到任意历史版本（旧版本保持温热，无需重建） |
| 停止服务 | `openship stop` |
| 升级 | `openship update` |
| 备份数据 | 面板/文档提供备份能力 |
| 迁移 | 见官方 "Migration guides"（迁移项目或整个安装） |

---

## 12. Web 控制面板

- 一个统一控制平面，管理：项目、部署、域名、Secrets、日志、指标、服务器、团队成员；
- 自托管实例需要登录（首个 admin 账号）；
- 支持在 Cloud 与自托管之间一键移动工作负载。

---

## 13. 桌面应用

- 原生 **Mac 与 Windows**（另有 Linux AppImage）；
- 从本地文件夹或仓库**直接推送到目标机器**，原生流式查看日志；
- **控制平面只在 App 打开时运行在你机器上**——无需额外常驻服务器、无公网暴露，最省心的单人模式；
- 控制平面不在任何"常驻中间层"持有你的代码。

---

## 14. Ship SDK / API / MCP

OpenShip 提供了编程式与 AI 集成的入口：

| 能力 | 说明 |
|---|---|
| **Ship SDK** | 从 JavaScript / TypeScript 部署；可连接已有 API，也可内嵌引擎 |
| **REST / HTTP API** | 调用 HTTP 端点完成部署、配置、查询（见 "API reference"） |
| **MCP** | 通过 MCP 协议连接 AI 工具（如 Claude 等 Agent），让 AI 直接触发部署、管理应用 |

---

## 15. Shell 自动补全

两种启用方式：

### 15.1 静态文件（推荐）

```bash
openship completion bash > /etc/bash_completion.d/openship
openship completion zsh > ~/.zsh/completions/_openship
openship completion fish > ~/.config/fish/completions/openship.fish
```

- 优点：shell 启动瞬间完成；
- 缺点：升级后需重新生成以纳入新命令。

### 15.2 实时加载

以 zsh 为例：

```bash
echo 'source <(openship completion zsh)' >> ~/.zshrc
```

- 优点：始终反映当前安装版本；
- 缺点：每个新 shell 会话增加一点启动延迟。

---

## 16. 与其他平台对比

| 维度 | OpenShip | Managed（Vercel / Netlify） | 自托管（Coolify / Dokploy / Dokku） |
|---|---|---|---|
| 运行位置 | Cloud 或自有机器，一键切换 | 仅托管，无法自托管 | 仅自托管 |
| 控制面板 | 自有；桌面 App 仅本地运行 | 全部在云端 | 需要一个常驻控制平面服务器 |
| 部署路径 | 桌面/CLI/仓库直推目标机器 | 上传到其云端 | 先落到常驻控制平面 |
| 已有容器 | 可直接接续已有容器（无需重建） | 需要从源码重新部署 | 部分支持 |
| 反向代理兼容 | 兼容现有 Traefik/nginx/Caddy，切换可逆 | 不适用 | 视实现而定 |
| 目标服务器 | 无 agent、无 daemon | 无 | 常驻服务 |

> 一句话：OpenShip 补上了"托管（省心）"与"自托管（可控）"之间的缝隙——一个控制平面，两套运行位置，随时可搬。

---

## 17. 常见问题与排错

**Q1：macOS 上 `openship up` 用的是什么模式？**
Bare 模式（单进程 + 嵌入式数据库），因为 macOS 默认不是 Compose 模式。

**Q2：为什么我的 Linux + Docker 默认是 Compose 模式？**
因为 Compose 模式能**在本机托管部署的应用**并提供自动域名 + TLS，这是默认最完整的形态；可用 `--bare` 强制。

**Q3：自托管需要登录吗？**
需要。首次运行向导创建的第一个 admin 即你的账号。

**Q4：系统 Node 版本旧于 22 怎么办？**
用官方脚本 `curl -fsSL https://get.openship.io | sh` 安装，它会自带一个 Node。

**Q5：想在服务器上装更多节点？**
自托管支持多服务器、多区域分发，连接即可加入。

**Q6：生产机器会执行构建吗？**
不会。构建始终在本地/云端，服务器只接收并运行镜像。

---

## 18. 参考链接

| 资源 | 地址 |
|---|---|
| 官网 | https://openship.io/ |
| 官方文档 | https://openship.io/docs |
| GitHub 仓库 | https://github.com/oblien/openship |
| npm 包 | https://www.npmjs.com/package/openship |
| 安装脚本 | `https://get.openship.io`（生产）/ `https://get.openship.io/dev`（开发版） |

---

*文档基于 OpenShip 官网、官方文档与 GitHub README 整理（信息截至 2026-10）。具体命令与配置以官方文档为准，`openship --help` 可查看本机实际命令。*

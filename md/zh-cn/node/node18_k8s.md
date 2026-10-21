---
title: Node.js 使用 Kubernetes 学习文档
create:2026-10-21
update:2026-10-21
category:devops
tags:[node,kubernetes,k8s,devops,container,docker,backend]
summary:Node.js 服务部署到 Kubernetes 的学习文档，覆盖 Pod、Deployment、Service、Ingress 与运维
keywords:[node,kubernetes,k8s,docker,deployment,container,devops]
top:1
copyright:true
---

# Node.js 使用 Kubernetes 学习文档

> 适用对象：已掌握 Node.js、Docker 基础，希望把 Node 应用跑上 K8s，或用 Node 程序控制 K8s 的开发者。
> 本文分两条主线：**A. 把 Node 应用部署到 K8s**（运维侧）；**B. 用 `@kubernetes/client-node` 从 Node 程序控制 K8s**（开发侧，API 速查为核心）。所有示例可直接使用（需一个可用集群）。

---

## 目录

1. [Kubernetes 是什么](#1-kubernetes-是什么)
2. [核心概念](#2-核心概念)
3. [环境准备](#3-环境准备)
4. [A 线：把 Node 应用部署到 K8s](#4-a-线把-node-应用部署到-k8s)
5. [B 线：@kubernetes/client-node API 完整速查](#5-b-线kubernetesclient-node-api-完整速查)
6. [使用模式与进阶（B 线）](#6-使用模式与进阶b-线)
7. [实战：用 Node 写一个轻量控制器](#7-实战用-node-写一个轻量控制器)
8. [RBAC 与权限](#8-rbac-与权限)
9. [常见坑与最佳实践](#9-常见坑与最佳实践)
10. [速查表 & 推荐学习路径](#10-速查表--推荐学习路径)

---

## 1. Kubernetes 是什么

**Kubernetes（K8s）** 是 Google 开源的**容器编排平台**，负责自动化部署、扩缩容、服务发现、自愈与配置管理。它管理的是"容器化应用"（你的 Node 程序打包成 Docker 镜像后跑在 Pod 里）。

⚠️ **重要澄清**：Kubernetes **不是数据库**。它是**集群操作系统 / 编排平台**。本文的"Node 使用 Kubernetes"包含两层含义：
- **A 线（部署）**：把你的 Node 服务容器化并跑在 K8s 集群上。
- **B 线（控制）**：用 Node 程序通过官方客户端库 `@kubernetes/client-node` **调用 K8s API**，实现自动发布、弹性伸缩、自定义控制器等。

> 一句话：A 线是"Node 当应用被 K8s 管"，B 线是"Node 当管理员去管 K8s"。

---

## 2. 核心概念

| 概念 | 说明 |
|---|---|
| **Pod** | 最小调度单位，包含一个或多个共享网络的容器（你的 Node 容器就在这） |
| **Deployment** | 管理 Pod 副本数与滚动更新的控制器，最常用 |
| **StatefulSet** | 有状态应用（数据库等），保证网络标识与存储稳定 |
| **Service** | 为一组 Pod 提供稳定虚拟 IP + 负载均衡（ClusterIP/NodePort/LoadBalancer） |
| **Ingress** | 集群入口，按域名/路径把外部流量路由到 Service（需 Ingress Controller） |
| **ConfigMap** | 存非机密配置（环境变量、配置文件） |
| **Secret** | 存机密（token、密码），base64 编码 |
| **Namespace** | 资源逻辑隔离（default / kube-system 等） |
| **Probe** | 健康检查：liveness（存活）/ readiness（就绪）/ startup（启动） |
| **HPA** | Horizontal Pod Autoscaler，按 CPU/自定义指标自动扩缩副本 |
| **RBAC** | Role / ClusterRole + RoleBinding，控制"谁能调哪些 API" |

---

## 3. 环境准备

```bash
# 1) 本地起一个单节点集群（二选一）
brew install kubectl kind && kind create cluster --name demo   # kind（推荐本地）
# 或
brew install minikube && minikube start

# 2) 验证
kubectl cluster-info
kubectl get nodes

# 3) Node 侧：安装官方客户端库
pnpm add @kubernetes/client-node
```

> 客户端库与集群版本：@kubernetes/client-node 各版本对应不同 K8s 版本（如 v0.20.x 对应 K8s 1.20）。版本错配可能缺字段，生产前用 `pnpm view @kubernetes/client-node version` 核对。

---

## 4. A 线：把 Node 应用部署到 K8s

### 4.1 多阶段 Dockerfile（非 root + 小体积）

```dockerfile
# ---- 构建阶段 ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build

# ---- 运行阶段 ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# 用非 root 用户跑，降低风险
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app
EXPOSE 3000
# 用 node 直接跑（不用 nodemon），K8s 负责重启
CMD ["node", "dist/main.js"]
```

### 4.2 Deployment（含探针、资源限制、配置注入）

```yaml
# deploy.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: node-api
  labels: { app: node-api }
spec:
  replicas: 3
  selector:
    matchLabels: { app: node-api }
  template:
    metadata:
      labels: { app: node-api }
    spec:
      containers:
        - name: node-api
          image: registry.example.com/node-api:v1.2.3   # 必须用具体 tag，禁 latest
          ports:
            - containerPort: 3000
          # 资源限制：防止单 Pod 吃光节点
          resources:
            requests: { cpu: "100m", memory: "128Mi" }
            limits:   { cpu: "500m", memory: "256Mi" }
          # 环境变量来自 ConfigMap / Secret
          envFrom:
            - configMapRef: { name: node-api-config }
            - secretRef:    { name: node-api-secret }
          # 探针：K8s 据此判定是否转发流量 / 是否重启
          readinessProbe:        # 就绪：通过才进负载均衡
            httpGet: { path: /healthz, port: 3000 }
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:         # 存活：失败则杀掉重启
            httpGet: { path: /healthz, port: 3000 }
            initialDelaySeconds: 15
            periodSeconds: 20
          startupProbe:          # 启动：给慢启动应用更宽容的窗口
            httpGet: { path: /healthz, port: 3000 }
            failureThreshold: 30
            periodSeconds: 2
```

```bash
kubectl apply -f deploy.yaml
kubectl rollout status deployment/node-api      # 观察滚动更新
kubectl rollout undo deployment/node-api        # 回滚到上一版
```

### 4.3 Service + Ingress

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata: { name: node-api-svc }
spec:
  selector: { app: node-api }
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP          # 集群内可达；对外用 NodePort / LoadBalancer
---
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: node-api-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: node-api-svc
                port: { number: 80 }
```

### 4.4 ConfigMap / Secret / HPA

```yaml
# config.yaml
apiVersion: v1
kind: ConfigMap
metadata: { name: node-api-config }
data:
  NODE_ENV: production
  LOG_LEVEL: info
---
apiVersion: v1
kind: Secret
metadata: { name: node-api-secret }
type: Opaque
stringData:        # 明文写，kubectl 自动 base64
  DATABASE_URL: "postgres://user:pass@db:5432/app"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: node-api-hpa }
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: node-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target: { type: Utilization, averageUtilization: 70 }
```

---

## 5. B 线：@kubernetes/client-node API 完整速查

### 5.1 加载配置（KubeConfig）

```ts
import * as k8s from '@kubernetes/client-node'

const kc = new k8s.KubeConfig()

// 方式一：默认加载（本地读 ~/.kube/config；容器内自动用 ServiceAccount）
kc.loadFromDefault()

// 方式二：指定文件
kc.loadFromFile('/path/to/kubeconfig')

// 方式三：集群内（Pod 里用，读 /var/run/secrets/kubernetes.io/serviceaccount）
kc.loadFromCluster()

// 多 context 场景
kc.getConfig().getContexts()            // 列出所有 context
kc.getCurrentContext()                  // 当前 context 名
kc.setCurrentContext('my-cluster')      // 切换 context
```

### 5.2 创建 API 客户端

```ts
// 按 API 组选择客户端类
const core = kc.makeApiClient(k8s.CoreV1Api)         // Pod/Service/ConfigMap/Secret/Node/Event
const apps = kc.makeApiClient(k8s.AppsV1Api)         // Deployment/StatefulSet/DaemonSet/ReplicaSet
const batch = kc.makeApiClient(k8s.BatchV1Api)       // Job/CronJob
const net = kc.makeApiClient(k8s.NetworkingV1Api)    // Ingress/NetworkPolicy
const rbac = kc.makeApiClient(k8s.RbacAuthorizationV1Api) // Role/RoleBinding
```

> `makeApiClient` 返回的类型化客户端，方法名遵循 `list/create/read/replace/patch/delete + NamespacedXxx` 模式。

### 5.3 CoreV1Api 常用方法（Pod 为例）

所有方法都有 **Promise 风格**（返回 `{ body, response }`）与 **callback 风格**两种；以下为 Promise 版。

| 方法 | 说明 |
|---|---|
| `listNamespacedPod(ns, ...)` | 列出某命名空间 Pod |
| `readNamespacedPod(name, ns)` | 读单个 Pod 详情 |
| `createNamespacedPod(ns, body)` | 创建 Pod（body 为 V1Pod） |
| `replaceNamespacedPod(name, ns, body)` | 整体替换（需带 resourceVersion） |
| `patchNamespacedPod(name, ns, body, ...opts)` | 局部更新（需 patch 头） |
| `deleteNamespacedPod(name, ns, ...)` | 删除 Pod |
| `listPodForAllNamespaces()` | 跨命名空间列出 |

**通用增删改查（以任意资源为例）**：

```ts
// 列表：res.body.items 是数组
const pods = await core.listNamespacedPod('default', undefined, undefined, undefined, undefined, 'app=node-api')
console.log(pods.body.items.length)

// 读取
const pod = await core.readNamespacedPod('node-api-xyz', 'default')
console.log(pod.body.status?.phase)

// 删除（可选优雅期 deletionGracePeriodSeconds）
await core.deleteNamespacedPod('node-api-xyz', 'default')
```

### 5.4 AppsV1Api（Deployment 等）

| 方法 | 说明 |
|---|---|
| `listNamespacedDeployment(ns)` | 列出 Deployment |
| `readNamespacedDeployment(name, ns)` | 读取 |
| `createNamespacedDeployment(ns, body)` | 创建 |
| `replaceNamespacedDeployment(name, ns, body)` | 替换 |
| `patchNamespacedDeployment(name, ns, body, ...)` | 局部更新（扩缩容常用） |
| `deleteNamespacedDeployment(name, ns)` | 删除 |
| `listNamespacedStatefulSet` / `DaemonSet` / `ReplicaSet` | 对应控制器 |

**扩缩容示例（patch replicas）**：

```ts
import * as k8s from '@kubernetes/client-node'
const apps = kc.makeApiClient(k8s.AppsV1Api)

await apps.patchNamespacedDeployment(
  'node-api', 'default',
  [{ op: 'replace', path: '/spec/replicas', value: 10 }],
  undefined, undefined, undefined, undefined, undefined,
  { headers: { 'Content-Type': k8s.PatchUtils.PATCH_FORMAT_JSON_PATCH } }
)
```

> `PatchUtils` 提供的常量：`PATCH_FORMAT_JSON_PATCH`（JSON Patch）、`PATCH_FORMAT_MERGE_PATCH`、`PATCH_FORMAT_STRATEGIC_MERGE_PATCH`、`PATCH_FORMAT_APPLY_PATCH`（server-side apply）。

### 5.5 BatchV1Api（Job / CronJob）

```ts
const batch = kc.makeApiClient(k8s.BatchV1Api)
// 创建一次性 Job
await batch.createNamespacedJob('default', {
  apiVersion: 'batch/v1', kind: 'Job',
  metadata: { name: 'migrate' },
  spec: {
    template: {
      spec: {
        restartPolicy: 'Never',
        containers: [{ name: 'm', image: 'node-api:v1', command: ['npm', 'run', 'migrate'] }],
      },
    },
  },
})
const jobs = await batch.listNamespacedJob('default')
```

### 5.6 NetworkingV1Api（Ingress）

```ts
const net = kc.makeApiClient(k8s.NetworkingV1Api)
const ingresses = await net.listNamespacedIngress('default')
```

### 5.7 其他常用客户端

| 客户端 | 覆盖资源 |
|---|---|
| `CoreV1Api` | Pod, Service, ConfigMap, Secret, Namespace, Node, Event, PersistentVolumeClaim, ResourceQuota |
| `AppsV1Api` | Deployment, StatefulSet, DaemonSet, ReplicaSet |
| `BatchV1Api` | Job, CronJob |
| `NetworkingV1Api` | Ingress, NetworkPolicy |
| `RbacAuthorizationV1Api` | Role, ClusterRole, RoleBinding, ClusterRoleBinding |
| `AutoscalingV2Api` | HorizontalPodAutoscaler |
| `StorageV1Api` | StorageClass, VolumeAttachment |

### 5.8 通用清单对象操作（apply YAML）

`KubernetesObjectApi` 可直接 apply 任意 manifest：

```ts
const client = k8s.KubernetesObjectApi.makeApiClient(kc)
const manifest = {
  apiVersion: 'v1', kind: 'ConfigMap',
  metadata: { name: 'demo', namespace: 'default' },
  data: { key: 'value' },
}
// create / read / replace / delete / apply
await client.create(manifest)        // 不存在则创建
await client.apply(manifest)          // server-side apply（幂等更新）
```

---

## 6. 使用模式与进阶（B 线）

### 6.1 监听事件（Watch）—— 实时感知变化

```ts
import * as k8s from '@kubernetes/client-node'
const kc = new k8s.KubeConfig(); kc.loadFromDefault()
const watch = new k8s.Watch(kc)

// 监听 default 下所有 Pod 的增删改
const req = await watch.watch(
  '/api/v1/namespaces/default/pods',
  { /* fieldSelector, labelSelector, resourceVersion */ },
  (type, apiObj, watchObj) => {
    // type: 'ADDED' | 'MODIFIED' | 'DELETED' | 'BOOKMARK' | 'ERROR'
    console.log(type, (apiObj as any).metadata?.name)
  },
  (err) => {
    if (err) console.error('watch 结束:', err)
  }
)

// 停止监听
// req.abort()
```

> 也可用各 API 的 `listNamespacedXxx(..., { watch: true })` 返回流式响应，适合需要类型推断的场景。

### 6.2 在 Pod 里执行命令（Exec）

```ts
import * as k8s from '@kubernetes/client-node'
const kc = new k8s.KubeConfig(); kc.loadFromDefault()
const exec = new k8s.Exec(kc)

await exec.exec(
  'default', 'node-api-xyz', 'node-api',
  ['sh', '-c', 'cat /etc/config/app.json'],
  process.stdout,   // stdout 流
  process.stderr,   // stderr 流
  null,             // stdin（传 null 表示不输入）
  false             // tty
)
```

### 6.3 端口转发（PortForward）

```ts
import * as k8s from '@kubernetes/client-node'
import * as net from 'net'
const kc = new k8s.KubeConfig(); kc.loadFromDefault()
const pf = new k8s.PortForward(kc)

await pf.portForward(
  'default', 'node-api-xyz', [3000],
  (addr, port) => net.connect(port, addr),   // 本地连接回调
  (err) => { if (err) console.error(err) }
)
```

### 6.4 流式读取日志（Log）

```ts
import * as k8s from '@kubernetes/client-node'
const kc = new k8s.KubeConfig(); kc.loadFromDefault()
const log = new k8s.Log(kc)

const stream = await log.log(
  'default', 'node-api-xyz', 'node-api',
  (chunk) => process.stdout.write(chunk),     // 收到日志块回调
  { follow: true, tailLines: 50, timestamps: true }
)
// stream.abort() 停止
```

### 6.5 错误处理

```ts
try {
  await core.readNamespacedPod('not-exist', 'default')
} catch (e: any) {
  // @kubernetes/client-node 抛 HttpError，含 statusCode / body
  console.log(e.statusCode)   // 404 / 403 / 409 ...
  console.log(e.body?.message)
}
```

| 状态码 | 含义 | 处理建议 |
|---|---|---|
| 401 / 403 | 未认证 / 无权限 | 检查 RBAC（第 8 节） |
| 404 | 资源不存在 | 确认 namespace / 名称 |
| 409 | 冲突（如已存在） | 先 read 再 replace，或 ignore |
| 422 | 字段校验失败 | 检查 manifest 结构 |

---

## 7. 实战：用 Node 写一个轻量控制器

监听 Deployment 变化，当副本数 > 10 时自动告警（演示 Watch + 业务逻辑）：

```ts
import * as k8s from '@kubernetes/client-node'
import { Watch } from '@kubernetes/client-node'

const kc = new k8s.KubeConfig(); kc.loadFromDefault()
const apps = kc.makeApiClient(k8s.AppsV1Api)
const watch = new k8s.Watch(kc)

async function main() {
  // 先全量拉一次基线
  const list = await apps.listNamespacedDeployment('default')
  for (const d of list.body.items) checkScale(d)

  // 再增量 watch
  await watch.watch(
    '/apis/apps/v1/namespaces/default/deployments',
    {},
    (type, obj: any) => {
      if (type === 'ADDED' || type === 'MODIFIED') checkScale(obj)
    },
    (err) => err && console.error(err)
  )
}

function checkScale(d: any) {
  const replicas = d.spec?.replicas ?? 0
  if (replicas > 10) {
    console.warn(`⚠️ ${d.metadata.name} 副本数过高: ${replicas}`)
    // 这里可接钉钉/Slack/webhook 告警
  }
}
main().catch(console.error)
```

> 这只是一个雏形。真正的 Operator 会用 CRD + 调谐循环（reconcile），社区有 `kubernetes-client` + 自研 informer 或更高层封装（如 `headlamp`、或 Go 的 controller-runtime）。Node 写复杂 Operator 不如 Go 生态成熟，但做"轻量自动化脚本/发布器"非常合适。

---

## 8. RBAC 与权限

在集群内用 client-node（Pod 里），默认用的是 **ServiceAccount**，必须给它授权，否则任何 API 调用都会 403。

```yaml
# rbac.yaml：给 default 命名空间的 serviceaccount "node-controller" 授予 pod/deployment 读写
apiVersion: v1
kind: ServiceAccount
metadata: { name: node-controller, namespace: default }
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata: { name: node-controller-role, namespace: default }
rules:
  - apiGroups: ["", "apps"]
    resources: ["pods", "deployments"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata: { name: node-controller-binding, namespace: default }
subjects:
  - kind: ServiceAccount
    name: node-controller
    namespace: default
roleRef:
  kind: Role
  name: node-controller-role
  apiGroup: rbac.authorization.k8s.io
```

```yaml
# 让 Deployment 使用该 ServiceAccount
spec:
  template:
    spec:
      serviceAccountName: node-controller
```

> 本地 `kubectl` 用的是 `~/.kube/config` 的 admin 权限；**进了集群后权限按 ServiceAccount 的 RBAC 来**，两者不同，别混淆。

---

## 9. 常见坑与最佳实践

1. **镜像禁用 `latest` tag**：K8s 默认 `imagePullPolicy: IfNotPresent`，用 `latest` 可能不拉新镜像，导致"改了代码没生效"。固定 tag + 滚动更新才可控。
2. **必须配资源 limits**：不限制 CPU/内存，单 Pod 可能拖垮整个节点（noisy neighbor），并导致调度失败。
3. **探针路径要真实可用**：liveness 指向一个会真正失败的服务端点，否则"假活"——进程卡死但探针仍过，K8s 不重启。
4. **readiness 与 liveness 分开**：只用 liveness 会导致启动慢的 Pod 一上线就被杀；用 startupProbe 给慢启动留窗口。
5. **client-node 版本要匹配集群**：大版本错配会缺字段或字段名变化，生产前核对兼容矩阵。
6. **patch 必须带 Content-Type 头**：漏了 `PatchUtils` 常量会报 415，见 5.4。
7. **集群内用 `loadFromCluster()` + RBAC**：别把 `~/.kube/config` 打进镜像，既不安全也不可移植。
8. **replace 需带正确 resourceVersion**：否则报 409 conflict；优先用 patch 局部更新。
9. **Secret 不是真加密**：base64 只是编码，敏感数据建议结合 Sealed Secrets / External Secrets / KMS。
10. **Watch 要处理重连**：watch 连接可能中断，生产需基于 `resourceVersion` 重连续传。

**最佳实践清单**：

- 用多阶段 Dockerfile，非 root 运行，镜像尽量小。
- 一切配置走 ConfigMap/Secret，绝不硬编码进镜像。
- 用 HPA 做弹性伸缩，而非手动 `kubectl scale`。
- 集群内程序统一用 ServiceAccount + 最小权限 RBAC。
- 用 `KubernetesObjectApi.apply()` 做幂等发布，避免重复创建冲突。
- 监控探针、日志、事件三件套齐全，出问题能快速定位。

---

## 10. 速查表 & 推荐学习路径

### 10.1 K8s 对象 → 客户端类 映射

| 你要操作的资源 | 客户端类 | 典型方法前缀 |
|---|---|---|
| Pod / Service / ConfigMap / Secret / Node | `CoreV1Api` | `list/create/read/replace/patch/deleteNamespaced...` |
| Deployment / StatefulSet / DaemonSet | `AppsV1Api` | 同上 |
| Job / CronJob | `BatchV1Api` | 同上 |
| Ingress | `NetworkingV1Api` | `list/createNamespacedIngress...` |
| Role / RoleBinding | `RbacAuthorizationV1Api` | 同上 |
| HPA | `AutoscalingV2Api` | `listNamespacedHorizontalPodAutoscaler...` |
| 任意 manifest | `KubernetesObjectApi` | `create/read/replace/patch/delete/apply` |

### 10.2 常用 kubectl 速查

| 操作 | 命令 |
|---|---|
| 应用配置 | `kubectl apply -f deploy.yaml` |
| 查看 Pod | `kubectl get pods -n default` |
| 进容器 | `kubectl exec -it <pod> -- sh` |
| 看日志 | `kubectl logs <pod> -f` |
| 扩缩容 | `kubectl scale deploy/node-api --replicas=10` |
| 滚动状态 | `kubectl rollout status deploy/node-api` |
| 回滚 | `kubectl rollout undo deploy/node-api` |
| 端口转发 | `kubectl port-forward pod/<pod> 3000:3000` |
| 删资源 | `kubectl delete -f deploy.yaml` |

### 10.3 推荐学习路径

1. A 线：写 Dockerfile → 部署 Deployment/Service/Ingress（第 4 节）→ 配探针与 HPA。
2. B 线：`loadFromDefault` → 用 `CoreV1Api`/`AppsV1Api` 做增删改查（第 5 节）。
3. 进阶：Watch 监听 + Exec/Log/PortForward（第 6 节）。
4. 实战：写一个 Node 自动化脚本（发布器/轻量控制器，第 7 节）。
5. 上生产：RBAC 最小权限 + 镜像固定 tag + 资源限制（第 8、9 节）。

---

> 本文基于 `@kubernetes/client-node` 主流版本编写，API 方法名随小版本可能微调；集群对象用 K8s 1.25+ 的 `apps/v1` / `networking.k8s.io/v1` / `autoscaling/v2`。官方文档：https://github.com/kubernetes-client/javascript

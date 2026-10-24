---
title: Go 语言并发编程：Goroutine 学习文档
create:2026-10-21
update:2026-10-21
category:golang
cover:https://img-common.aknot.uk/cover/land-48.jpg
tags:[go,golang,goroutine,channel,concurrency,context,sync,atomic,worker-pool,beginner-to-advanced]
summary:Go 语言 Goroutine 并发编程学习文档，从 go 关键字基础，到 channel / context / sync / atomic 各类同步原语，再到 worker pool、fan-out/fan-in、pipeline 等并发模式与常见坑（数据竞争、goroutine 泄漏、panic 传播、循环变量捕获），每节均含可运行示例
keywords:[go,golang,goroutine,channel,context,sync,atomic,concurrency]
top:1
copyright:true
---

# Go 语言并发编程：Goroutine 学习文档

> 适用版本：Go **1.27**（最新稳定版，2026-08-19 发布；文档同时说明 1.22 起的新语法）。
> 本文定位「入门 → 进阶 → 高阶」循序渐进，覆盖 **Goroutine、Channel、sync 同步原语、atomic 原子操作、context 上下文、常用并发模式与陷阱**。
> 前置阅读：建议先掌握 [go01_basic.md](./go01_basic.md) 的函数、切片、映射、指针与 `defer`/`panic` 基础。

---

## 目录

- [1. 并发与并行：核心概念](#1-并发与并行核心概念)
- [2. Goroutine 入门（go 关键字）](#2-goroutine-入门go-关键字)
- [3. 匿名函数启动与参数传递](#3-匿名函数启动与参数传递)
- [4. 同步原语：sync 包](#4-同步原语sync-包)
  - [4.1 sync.WaitGroup（等待一组任务）](#41-syncwaitgroup等待一组任务)
  - [4.2 sync.Mutex / RWMutex（互斥锁）](#42-syncmutex--rwmutex互斥锁)
  - [4.3 sync.Once（只执行一次）](#43-synconce只执行一次)
  - [4.4 sync.Map（并发安全映射）](#44-syncmap并发安全映射)
  - [4.5 sync.Pool（对象复用池）](#45-syncpool对象复用池)
  - [4.6 sync.Cond（条件变量）](#46-synccond条件变量)
  - [4.7 sync/atomic（原子操作）](#47-syncatomic原子操作)
- [5. Channel 通道](#5-channel-通道)
  - [5.1 创建与基本收发](#51-创建与基本收发)
  - [5.2 无缓冲 vs 缓冲通道](#52-无缓冲-vs-缓冲通道)
  - [5.3 关闭通道与 range 遍历](#53-关闭通道与-range-遍历)
  - [5.4 单向通道（类型约束）](#54-单向通道类型约束)
  - [5.5 select 多路复用](#55-select-多路复用)
- [6. context 上下文（取消 / 超时 / 传值）](#6-context-上下文取消--超时--传值)
- [7. 并发设计模式](#7-并发设计模式)
  - [7.1 Worker Pool（工作池 / 限流）](#71-worker-pool工作池--限流)
  - [7.2 Fan-out / Fan-in（扇出 / 扇入）](#72-fan-out--fan-in扇出--扇入)
  - [7.3 Pipeline（流水线）](#73-pipeline流水线)
  - [7.4 超时与默认分支](#74-超时与默认分支)
- [8. errgroup 结构化并发](#8-errgroup-结构化并发)
- [9. runtime 调度相关](#9-runtime-调度相关)
- [10. 常见坑与最佳实践](#10-常见坑与最佳实践)
- [11. 综合实战：受限并发爬虫](#11-综合实战受限并发爬虫)
- [12. 参考文档](#12-参考文档)

---

## 1. 并发与并行：核心概念

- **并发（Concurrency）**：同一时间段内**交替**处理多件事，强调「结构设计」——多个任务在逻辑上同时推进。
- **并行（Parallelism）**：同一时刻**真正同时**执行多件事，强调「硬件执行」——多核同时跑多个任务。

Go 的并发模型是 **CSP（Communicating Sequential Processes，通信顺序进程）**：「**不要通过共享内存来通信，而要通过通信来共享内存**」。Goroutine 是 Go 运行时调度的轻量级线程，channel 是 goroutine 之间传递数据的管道。

> Go 的调度器（GMP 模型：Goroutine / Machine / Processor）会把成千上万个 goroutine 多路复用到少量操作系统线程上，由 Go runtime 而非操作系统负责调度，因此创建成本极低（初始栈仅 2KB，按需增长）。

---

## 2. Goroutine 入门（go 关键字）

只需在函数/方法调用前加 `go` 关键字，就能让它在一个新的 goroutine 中**并发**执行，调用方立即返回、不等待。

```go
package main

import (
    "fmt"
    "time"
)

// say 模拟一个耗时的周期性任务
func say(s string) {
    for i := 0; i < 3; i++ {
        fmt.Println(s)
        time.Sleep(100 * time.Millisecond) // 让出时间片，便于观察交替
    }
}

func main() {
    go say("world") // 启动一个 goroutine，立即返回
    say("hello")    // 在主 goroutine 中执行
    // 主 goroutine 结束时，程序整体退出（不会等待其它 goroutine）
}
```

**关键点**：
- `go f()` 是非阻塞的——主函数不等 `world` 跑完就继续。
- **主 goroutine 退出即程序退出**，其它还没跑完的 goroutine 会被强制终止。上面靠主 goroutine 的 `say("hello")` 自然耗时来「凑」出等待，这只是演示；真实项目请用 `sync.WaitGroup` 或 channel 做明确同步（见第 4、5 节）。

---

## 3. 匿名函数启动与参数传递

### 3.1 传参而非闭包共享

把外部变量作为参数传入，是最安全的做法，避免多个 goroutine 共享同一变量引发的竞态。

```go
func main() {
    for i := 0; i < 3; i++ {
        i := i // Go 1.22 起 for 循环变量每轮是新变量，可省略；旧版本/求稳请保留
        go func(n int) {
            fmt.Println("goroutine", n)
        }(i) // 立即传值，每个 goroutine 拿到独立的副本
    }
    time.Sleep(time.Second) // 仅演示用，真实场景用 WaitGroup
}
```

### 3.2 闭包陷阱（循环变量捕获）

**Go 1.22 之前**：`for` 的循环变量在整个循环中是同一个变量，所有 goroutine 闭包都捕获到「最终值」。下面在 Go 1.21 及更早版本会全部打印 `3`：

```go
// ⚠️ Go 1.21 及以前的典型 bug
for i := 0; i < 3; i++ {
    go func() {
        fmt.Println(i) // 三个 goroutine 都打印 3（i 已自增到 3）
    }()
}
```

**修复方式**（两种，均兼容全版本）：

```go
// 方式 1：函数参数传值（推荐，最清晰）
for i := 0; i < 3; i++ {
    go func(n int) { fmt.Println(n) }(i)
}

// 方式 2：循环体内复制变量
for i := 0; i < 3; i++ {
    i := i // 创建局部副本，每个 goroutine 捕获不同的 i
    go func() { fmt.Println(i) }()
}
```

> **Go 1.22 起语言已修复**：`for i := range` / `for i := 0; ...` 的循环变量在每轮迭代都是新变量，上述闭包陷阱不复存在。但养成「传参」的习惯依然最稳妥、可读性最好。

---

## 4. 同步原语：sync 包

`sync` 包提供低层同步原语。它们**不能复制**（含 `sync.Mutex` 的 struct 不要按值传递），且通常被用作 struct 字段，需传指针使用。

### 4.1 sync.WaitGroup（等待一组任务）

`WaitGroup` 用于等待**一组** goroutine 全部完成。三个方法：

| 方法 | 作用 |
|------|------|
| `Add(delta int)` | 计数器 +delta（启动任务前调用） |
| `Done()` | 计数器 -1（通常用 `defer wg.Done()`） |
| `Wait()` | 阻塞，直到计数器归零 |

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

func worker(id int, wg *sync.WaitGroup) {
    defer wg.Done() // 任务结束，计数器 -1
    fmt.Printf("worker %d 开始\n", id)
    time.Sleep(time.Duration(id) * 100 * time.Millisecond)
    fmt.Printf("worker %d 完成\n", id)
}

func main() {
    var wg sync.WaitGroup
    for i := 1; i <= 3; i++ {
        wg.Add(1) // 每启动一个 goroutine，计数 +1
        go worker(i, &wg)
    }
    wg.Wait() // 阻塞，直到 3 个 worker 都 Done
    fmt.Println("全部完成")
}
```

> **务必 `Add` 在 `go` 之前**：若在 goroutine 内部 `Add`，主 goroutine 的 `Wait()` 可能先于 `Add` 执行，导致提前归零或 panic（`sync: WaitGroup is reused before previous Wait has returned`）。

### 4.2 sync.Mutex / RWMutex（互斥锁）

多个 goroutine 读写**同一块内存**时必须加锁，否则产生**数据竞争（data race）**。

| 类型 | 方法 | 说明 |
|------|------|------|
| `sync.Mutex` | `Lock()` / `Unlock()` | 互斥，读写都独占 |
| `sync.RWMutex` | `RLock()` / `RUnlock()` | 读锁（可并发） |
| `sync.RWMutex` | `Lock()` / `Unlock()` | 写锁（独占） |
| 二者共有 | `TryLock()`（Go 1.18+） | 非阻塞尝试加锁，成功返回 true |

```go
package main

import (
    "fmt"
    "sync"
)

var (
    counter int
    mu      sync.Mutex
)

func increment(wg *sync.WaitGroup) {
    defer wg.Done()
    mu.Lock()         // 进入临界区前加锁
    defer mu.Unlock() // 离开临界区解锁（defer 保证异常也释放）
    counter++
}

func main() {
    var wg sync.WaitGroup
    for i := 0; i < 1000; i++ {
        wg.Add(1)
        go increment(&wg)
    }
    wg.Wait()
    fmt.Println("counter =", counter) // 稳定输出 1000
}
```

**读多写少用 RWMutex**：

```go
var (
    cache = map[string]string{}
    rw    sync.RWMutex
)

func read(k string) string {
    rw.RLock()         // 多个读可并发
    defer rw.RUnlock()
    return cache[k]
}

func write(k, v string) {
    rw.Lock()         // 写独占，期间任何读/写都阻塞
    defer rw.Unlock()
    cache[k] = v
}
```

> **死锁提醒**：`Lock` 之后必须 `Unlock`；不要在持锁期间调用会再次请求同一把锁的函数（重入死锁）；多把锁时所有代码路径保持一致的加锁顺序。

### 4.3 sync.Once（只执行一次）

`sync.Once.Do(f)` 保证 `f` 在整个程序生命周期内**只执行一次**，常用于单例初始化、配置加载、懒加载。

```go
package main

import (
    "fmt"
    "sync"
)

var (
    once   sync.Once
    config string
)

func loadConfig() {
    once.Do(func() { // 无论多少 goroutine 调用，只执行一次
        config = "loaded-config"
        fmt.Println("配置只加载一次")
    })
}

func main() {
    var wg sync.WaitGroup
    for i := 0; i < 5; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            loadConfig()
        }()
    }
    wg.Wait()
    fmt.Println("config =", config)
}
```

### 4.4 sync.Map（并发安全映射）

普通 `map` 不是并发安全的（多 goroutine 同时写会 `fatal error: concurrent map writes`）。`sync.Map` 是专为特定场景优化的并发安全映射：**适合读多写少、且 key 集合相对稳定**的场景；否则直接用 `map` + `RWMutex` 更可控、更省内存。

| 方法 | 说明 |
|------|------|
| `Store(key, value)` | 写入/覆盖 |
| `Load(key) (value, ok)` | 读取 |
| `LoadOrStore(key, value) (actual, loaded)` | 不存在则写入，返回实际值与「是否已存在」 |
| `Delete(key)` | 删除 |
| `LoadAndDelete(key) (value, loaded)` | 读取并删除 |
| `Range(f func(key, value any) bool)` | 遍历（回调返回 false 停止） |

```go
package main

import (
    "fmt"
    "sync"
)

func main() {
    var m sync.Map

    m.Store("a", 1)
    m.Store("b", 2)

    if v, ok := m.Load("a"); ok {
        fmt.Println("a =", v) // 1
    }

    // 仅当 key 不存在时才写入
    actual, loaded := m.LoadOrStore("a", 100)
    fmt.Println(actual, loaded) // 1 true（已存在，未覆盖）

    m.Delete("b")

    m.Range(func(k, v any) bool {
        fmt.Printf("%v=%v\n", k, v)
        return true // 返回 false 可提前终止遍历
    })
}
```

### 4.5 sync.Pool（对象复用池）

`sync.Pool` 用于**复用临时对象**（如 `bytes.Buffer`、大切片），减轻 GC 压力。注意：**Pool 中的对象随时可能被回收（如发生 GC）**，不能用于需要持久存在的对象。

| 字段 / 方法 | 说明 |
|------|------|
| `New func() any` | 池空时如何创建新对象 |
| `Get() any` | 取一个（可能返回 nil，若未设 New） |
| `Put(x any)` | 归还对象到池中 |

```go
package main

import (
    "bytes"
    "fmt"
    "sync"
)

var bufPool = sync.Pool{
    New: func() any { return new(bytes.Buffer) }, // 池空时新建
}

func process(s string) string {
    buf := bufPool.Get().(*bytes.Buffer) // 取出并断言类型
    defer bufPool.Put(buf)               // 用完归还
    buf.Reset()                          // 复用前必须重置，避免残留旧数据
    buf.WriteString("processed: ")
    buf.WriteString(s)
    return buf.String()
}

func main() {
    fmt.Println(process("hello"))
    fmt.Println(process("world"))
}
```

### 4.6 sync.Cond（条件变量）

`Cond` 让一组 goroutine **等待某个条件成立**才被唤醒，比「忙等轮询」高效。需配合一个 `Locker`（通常是 `Mutex`）使用。

| 方法 | 说明 |
|------|------|
| `sync.NewCond(l Locker) *Cond` | 用锁构造 |
| `Wait()` | 释放锁并阻塞，被唤醒后重新加锁 |
| `Signal()` | 唤醒**一个**等待者 |
| `Broadcast()` | 唤醒**所有**等待者 |

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

var (
    mu    sync.Mutex
    cond  = sync.NewCond(&mu)
    ready bool
)

func waiter(id int) {
    mu.Lock()
    for !ready { // 必须用 for 循环检查（防止伪唤醒）
        cond.Wait()
    }
    fmt.Printf("waiter %d 收到信号\n", id)
    mu.Unlock()
}

func main() {
    for i := 1; i <= 3; i++ {
        go waiter(i)
    }
    time.Sleep(500 * time.Millisecond)
    mu.Lock()
    ready = true
    mu.Unlock()
    cond.Broadcast() // 唤醒全部 waiter
    time.Sleep(200 * time.Millisecond)
}
```

> **必须用 `for` 而非 `if` 检查条件**：`Wait` 返回后条件未必已满足（伪唤醒、或别的 waiter 抢先消费），必须重新判断。

### 4.7 sync/atomic（原子操作）

原子操作在**单条指令**级别完成「读-改-写」，无需加锁，性能优于 `Mutex`，适合简单计数器、标志位等场景。

**函数式 API**（操作地址）：

| 函数 | 说明 |
|------|------|
| `atomic.AddInt64(&v, delta)` | 原子加 |
| `atomic.LoadInt64(&v)` | 原子读 |
| `atomic.StoreInt64(&v, val)` | 原子写 |
| `atomic.SwapInt64(&v, new)` | 原子交换，返回旧值 |
| `atomic.CompareAndSwapInt64(&v, old, new)` | CAS，成功返回 true |

```go
package main

import (
    "fmt"
    "sync"
    "sync/atomic"
)

func main() {
    var counter int64
    var wg sync.WaitGroup
    for i := 0; i < 1000; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            atomic.AddInt64(&counter, 1) // 无锁自增，线程安全
        }()
    }
    wg.Wait()
    fmt.Println("counter =", atomic.LoadInt64(&counter)) // 1000
}
```

**类型化原子值（Go 1.19+）**：推荐新代码使用，类型更安全、可读性更好：

```go
var cnt atomic.Int64
cnt.Add(1)
cnt.Load()
cnt.Store(10)
cnt.Swap(5)
cnt.CompareAndSwap(5, 6)

var flag atomic.Bool
flag.Store(true)
_ = flag.Load()

// atomic.Value：可存任意类型的原子容器（一旦 Store 过某类型，后续只能存同类型）
var box atomic.Value
box.Store("hello")
s := box.Load().(string)
fmt.Println(s)

// atomic.Pointer[T]（Go 1.19+）：类型安全的指针原子
var ptr atomic.Pointer[int]
n := 42
ptr.Store(&n)
fmt.Println(*ptr.Load())
```

> 选型建议：简单计数器/标志 → `atomic`；复杂临界区或涉及多个变量一致性 → `Mutex`；只读配置发布（write-once）→ `atomic.Value`。

---

## 5. Channel 通道

Channel 是 goroutine 之间的**类型化管道**，遵循 FIFO。它是 Go 并发哲学的核心载体。

### 5.1 创建与基本收发

```go
ch := make(chan int)     // 无缓冲通道
chBuf := make(chan int, 3) // 缓冲容量为 3 的通道

ch <- 42        // 发送（向通道写入）
v := <-ch       // 接收（从通道读出），并丢弃值可用 <-ch
v, ok := <-ch   // ok=false 表示通道已关闭且无剩余数据
```

### 5.2 无缓冲 vs 缓冲通道

- **无缓冲通道**：发送方和接收方必须**同时就绪**（rendezvous / 同步点）。一方没准备好，另一方阻塞。常用于「握手」同步。
- **缓冲通道**：缓冲区未满时发送不阻塞，缓冲区非空时接收不阻塞。用于解耦生产/消费速度。

```go
package main

import (
    "fmt"
    "time"
)

// 无缓冲：发送阻塞，直到有人接收
func demoUnbuffered() {
    ch := make(chan string)
    go func() {
        ch <- "hello" // 阻塞，直到 main 接收
    }()
    msg := <-ch // 接收，双方在此「会合」
    fmt.Println(msg)
}

// 缓冲：可先发送，不必立即有人接收
func demoBuffered() {
    ch := make(chan int, 2)
    ch <- 1 // 不阻塞（缓冲区有空位）
    ch <- 2 // 不阻塞
    fmt.Println(<-ch, <-ch)
}

func main() {
    demoUnbuffered()
    demoBuffered()
    time.Sleep(10 * time.Millisecond)
}
```

### 5.3 关闭通道与 range 遍历

| 操作 | 规则 |
|------|------|
| `close(ch)` | 由**发送方**关闭，表示「不再有数据」 |
| `v, ok := <-ch` | `ok=false` 表示已关闭且无数据 |
| `for v := range ch` | 自动在通道关闭且取空后退出循环 |

```go
package main

import "fmt"

func main() {
    ch := make(chan int, 3)
    ch <- 1
    ch <- 2
    ch <- 3
    close(ch) // 发送完毕后关闭

    // 方式 1：range 自动在关闭后退出
    for v := range ch {
        fmt.Println(v) // 1 2 3
    }

    // 方式 2：显式判断 ok
    ch2 := make(chan int, 1)
    ch2 <- 9
    close(ch2)
    if v, ok := <-ch2; ok {
        fmt.Println(v) // 9
    }
}
```

> **关闭通道的铁律**：
> 1. **只能由发送方关闭**，且**只能关闭一次**——对已关闭的通道再 `close` 会 `panic`。
> 2. **向已关闭的通道发送会 `panic`**；从已关闭的通道接收则立即返回零值（若有缓冲数据则先返回数据）。
> 3. **向 `nil` 通道发送/接收会永久阻塞**（常用于 `select` 中动态「禁用」某个分支）。
> 4. 多个发送方时，避免重复关闭——可改用额外的 `done` channel + `sync.Once` 或专门的 close goroutine。

### 5.4 单向通道（类型约束）

函数参数可以用「只发送 / 只接收」通道类型做**编译期约束**：

```go
// 只接收
func consumer(ch <-chan int) {
    for v := range ch {
        fmt.Println("消费", v)
    }
}

// 只发送
func producer(ch chan<- int) {
    defer close(ch)
    for i := 1; i <= 3; i++ {
        ch <- i
    }
}

func main() {
    ch := make(chan int, 3)
    producer(ch)  // chan 自动转为 chan<-
    consumer(ch)  // chan 自动转为 <-chan
}
```

### 5.5 select 多路复用

`select` 类似 `switch`，但每个 `case` 是一个**通道操作**，用于同时等待多个通道。

- 多个 `case` 就绪时，**随机**选一个（避免饥饿）。
- 无 `default` 时，所有 `case` 都阻塞则 `select` 阻塞。
- 有 `default` 时，无就绪分支则立即执行 `default`（实现非阻塞）。

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    ch1 := make(chan string)
    ch2 := make(chan string)

    go func() {
        time.Sleep(100 * time.Millisecond)
        ch1 <- "from ch1"
    }()
    go func() {
        time.Sleep(50 * time.Millisecond)
        ch2 <- "from ch2"
    }()

    for i := 0; i < 2; i++ {
        select {
        case v := <-ch1:
            fmt.Println(v)
        case v := <-ch2:
            fmt.Println(v)
        }
    }
}
```

**非阻塞收发**（用于「有就处理，没有就做别的」）：

```go
select {
case v := <-ch:
    fmt.Println("收到", v)
default:
    fmt.Println("通道暂无可读数据，去做别的事")
}
```

---

## 6. context 上下文（取消 / 超时 / 传值）

`context` 用于在 **goroutine 树**中传递**取消信号、截止时间、请求范围的值**。它是控制并发生命周期的标准方式，尤其是 HTTP 请求、RPC、数据库查询等「需要随时中止」的场景。

**四个核心构造函数**：

| 函数 | 说明 |
|------|------|
| `context.Background()` | 根 context（主函数/顶层用） |
| `context.TODO()` | 暂未确定用哪个时使用（占位） |
| `WithCancel(parent) (ctx, cancel)` | 返回可手动取消的 ctx |
| `WithTimeout(parent, d) (ctx, cancel)` | 超时（相对时长）自动取消 |
| `WithDeadline(parent, t) (ctx, cancel)` | 到某个时间点自动取消 |
| `WithValue(parent, key, val)` | 携带请求范围的键值 |

**关键读取方法**：

| 方法 | 说明 |
|------|------|
| `ctx.Done() <-chan struct{}` | 取消时关闭的通道，用于 `select` 监听 |
| `ctx.Err() error` | 取消原因（`Canceled` / `DeadlineExceeded`） |
| `ctx.Value(key) any` | 取值 |
| `ctx.Deadline() (t time.Time, ok bool)` | 获取截止时间 |

```go
package main

import (
    "context"
    "fmt"
    "time"
)

// 一个可取消、可超时的 worker
func worker(ctx context.Context, id int) {
    for {
        select {
        case <-ctx.Done(): // 收到取消信号
            fmt.Printf("worker %d 退出: %v\n", id, ctx.Err())
            return
        default:
            fmt.Printf("worker %d 工作中...\n", id)
            time.Sleep(300 * time.Millisecond)
        }
    }
}

func main() {
    // 方式 1：超时取消
    ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
    defer cancel() // 务必调用，释放资源（即使已超时）

    go worker(ctx, 1)
    time.Sleep(2 * time.Second) // 等待 worker 因超时退出
}
```

**手动取消 + 传值**：

```go
package main

import (
    "context"
    "fmt"
    "time"
)

// 自定义 key 类型，避免与其它包 key 冲突
type ctxKey string

const userKey ctxKey = "user"

func handle(ctx context.Context) {
    if u, ok := ctx.Value(userKey).(string); ok {
        fmt.Println("处理用户:", u)
    }
    select {
    case <-time.After(2 * time.Second):
        fmt.Println("正常完成")
    case <-ctx.Done():
        fmt.Println("被取消:", ctx.Err())
    }
}

func main() {
    ctx, cancel := context.WithCancel(context.Background())
    ctx = context.WithValue(ctx, userKey, "alice")

    go handle(ctx)

    time.Sleep(500 * time.Millisecond)
    cancel() // 主动取消
    time.Sleep(100 * time.Millisecond)
}
```

> **context 使用守则**：
> 1. `cancel` 函数**一定要调用**（`defer cancel()`），否则可能 goroutine/定时器泄漏。
> 2. **把 `ctx` 作为函数第一个参数**（`ctx context.Context`）向下传递，不要存进 struct。
> 3. `WithValue` 只放**请求范围**的元数据（traceID、userID），**不要**用它传可选参数。
> 4. 不要用 `context` 取消的通道去做普通数据传递——那该用普通 channel。

---

## 7. 并发设计模式

### 7.1 Worker Pool（工作池 / 限流）

用**固定数量的 worker goroutine** 消费任务通道，从而限制并发数，防止资源耗尽。

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

func worker(id int, jobs <-chan int, wg *sync.WaitGroup) {
    defer wg.Done()
    for j := range jobs { // 通道关闭时自动退出
        fmt.Printf("worker %d 处理任务 %d\n", id, j)
        time.Sleep(100 * time.Millisecond)
    }
}

func main() {
    const numWorkers = 3
    jobs := make(chan int, 10)

    var wg sync.WaitGroup
    for i := 1; i <= numWorkers; i++ {
        wg.Add(1)
        go worker(i, jobs, &wg)
    }

    // 投递任务
    for t := 1; t <= 9; t++ {
        jobs <- t
    }
    close(jobs) // 投递完毕，关闭通道让 worker 退出

    wg.Wait() // 等待所有 worker 结束
    fmt.Println("全部任务完成")
}
```

### 7.2 Fan-out / Fan-in（扇出 / 扇入）

- **Fan-out**：把任务分发给多个 worker 并行处理。
- **Fan-in**：把多个 channel 的结果合并到一个 channel。

```go
package main

import (
    "fmt"
    "sync"
)

// gen 把切片转成 channel（扇出数据源）
func gen(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, n := range nums {
            out <- n
        }
    }()
    return out
}

// square 处理数据（可被多个 worker 并行调用 = 扇出）
func square(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            out <- n * n
        }
    }()
    return out
}

// merge 把多个 channel 合并为一个（扇入）
func merge(chs ...<-chan int) <-chan int {
    out := make(chan int)
    var wg sync.WaitGroup
    for _, c := range chs {
        wg.Add(1)
        go func(ch <-chan int) {
            defer wg.Done()
            for v := range ch {
                out <- v
            }
        }(c)
    }
    go func() {
        wg.Wait()
        close(out)
    }()
    return out
}

func main() {
    in := gen(2, 3, 4)

    // 两个平方 worker 并行 = Fan-out
    c1 := square(in)
    c2 := square(in)

    // 合并结果 = Fan-in
    for v := range merge(c1, c2) {
        fmt.Println(v)
    }
}
```

### 7.3 Pipeline（流水线）

把多个阶段串成管道：每个阶段是「接收 -> 处理 -> 发送」的 goroutine。下面的三段式管道演示 `generator -> square -> filter`。

```go
package main

import "fmt"

func generator(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, n := range nums {
            out <- n
        }
    }()
    return out
}

func square(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            out <- n * n
        }
    }()
    return out
}

func filterEven(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            if n%2 == 0 { // 只保留偶数
                out <- n
            }
        }
    }()
    return out
}

func main() {
    // 串联：gen -> square -> filterEven
    for v := range filterEven(square(generator(1, 2, 3, 4, 5))) {
        fmt.Println(v) // 4 16 （2²=4, 4²=16）
    }
}
```

### 7.4 超时与默认分支

在管道或请求处理中给通道操作加超时，避免永久阻塞：

```go
select {
case v := <-resultCh:
    fmt.Println("结果:", v)
case <-time.After(2 * time.Second):
    fmt.Println("处理超时")
}
```

---

## 8. errgroup 结构化并发

标准库 `sync` 没有「等待一组任务且任一处错误即取消全部」的设施。`golang.org/x/sync/errgroup` 在 `WaitGroup` 基础上增加了**错误传播**与**context 联动取消**。

```bash
go get golang.org/x/sync/errgroup
```

```go
package main

import (
    "context"
    "fmt"
    "golang.org/x/sync/errgroup"
    "time"
)

func doWork(ctx context.Context, id int) error {
    select {
    case <-time.After(time.Duration(id) * 300 * time.Millisecond):
        if id == 3 {
            return fmt.Errorf("worker %d 失败", id) // 模拟某个任务出错
        }
        fmt.Printf("worker %d 成功\n", id)
        return nil
    case <-ctx.Done():
        return ctx.Err() // 被取消（因同伴出错）
    }
}

func main() {
    // WithContext 返回一个与 errgroup 绑定的 ctx：任一 goroutine 返回非 nil 错误，
    // 该 ctx 会被 cancel，其余 goroutine 通过监听 ctx.Done() 及时退出。
    g, ctx := errgroup.WithContext(context.Background())

    for i := 1; i <= 4; i++ {
        i := i
        g.Go(func() error {
            return doWork(ctx, i)
        })
    }

    if err := g.Wait(); err != nil {
        fmt.Println("整体失败:", err)
        return
    }
    fmt.Println("全部成功")
}
```

| 方法 | 说明 |
|------|------|
| `errgroup.WithContext(ctx)` | 返回 `(*Group, ctx)`；错误触发 ctx 取消 |
| `g.Go(f func() error)` | 启动一个任务（类似 `wg.Add(1)` + `go f()`） |
| `g.TryGo(f func() error) bool` | 受 `SetLimit` 限流时，若达上限返回 false 不启动 |
| `g.SetLimit(n int)` | 限制最大并发数（0 = 不限制；Go 1.19+ 的 x/sync） |
| `g.Wait() error` | 等待全部完成，返回**第一个**非 nil 错误 |

> `errgroup` 是「结构化并发」在 Go 里的落地：启动、等待、错误取消、限流一条龙，强烈推荐替代手写 `WaitGroup + channel + context` 样板。

---

## 9. runtime 调度相关

| 函数 | 说明 |
|------|------|
| `runtime.NumGoroutine() int` | 当前存活 goroutine 数量（含主 goroutine） |
| `runtime.GOMAXPROCS(n int) int` | 设置可并行执行的最大 OS 线程数；传 0 返回当前值 |
| `runtime.Gosched()` | 主动让出当前 goroutine 的时间片 |
| `runtime.Goexit()` | 立即终止当前 goroutine（已注册的 defer 仍执行） |
| `runtime.NumCPU() int` | 逻辑 CPU 数量 |

```go
package main

import (
    "fmt"
    "runtime"
    "time"
)

func main() {
    fmt.Println("CPU 数:", runtime.NumCPU())
    fmt.Println("GOMAXPROCS:", runtime.GOMAXPROCS(0))
    fmt.Println("启动前 goroutine 数:", runtime.NumGoroutine()) // 1

    go func() {
        time.Sleep(time.Second)
    }()
    fmt.Println("启动后 goroutine 数:", runtime.NumGoroutine()) // 2
}
```

> 通常**无需手动调 `GOMAXPROCS`**——Go 默认等于 CPU 核数。只有在容器/配额场景下（Go 1.25 前的老版本可能误读 cgroup 限制）才需要显式设置。

---

## 10. 常见坑与最佳实践

### 10.1 数据竞争（data race）

多个 goroutine 无同步地读写同一变量：

```go
// ❌ 竞态：结果不确定，可能 < 1000，且 `go test -race` 会报竞争
var counter int
for i := 0; i < 1000; i++ {
    go func() { counter++ }()
}
```

修复：用 `sync.Mutex`、`atomic` 或 channel 串行化访问（见第 4 节）。**开发阶段务必开启 `-race` 检测**：

```bash
go run -race main.go
go test -race ./...
```

### 10.2 Goroutine 泄漏

goroutine 永久阻塞、永远退不出（常因通道无人接收/关闭）：

```go
// ❌ 泄漏：ch 无接收方，goroutine 在 <-ch 永久阻塞
func leak() {
    ch := make(chan int)
    go func() {
        val := <-ch // 永远阻塞
        fmt.Println(val)
    }()
    // 函数返回，但 goroutine 还在等，泄漏
}
```

修复：用 `context` 取消、用 `select + default/done`、确保通道有接收方或被关闭、用 `errgroup` 统一管理生命周期。

### 10.3 panic 跨 goroutine 不传播

子 goroutine 的 `panic` **不会**被主 goroutine 的 `recover` 捕获，而是**直接崩溃整个程序**：

```go
func main() {
    defer func() {
        if r := recover(); r != nil {
            fmt.Println("恢复:", r) // ❌ 捕获不到子 goroutine 的 panic
        }
    }()
    go func() {
        panic("子 goroutine 炸了") // 整个进程崩溃
    }()
    time.Sleep(time.Second)
}
```

修复：在**每个 goroutine 内部**自行 `recover`，或把任务交给 `errgroup`/`panicwrap` 这类框架统一兜底。

### 10.4 错误关闭/发送通道

- 向已关闭的通道发送 → `panic`
- 重复 `close` 同一通道 → `panic`
- 向 `nil` 通道发送/接收 → 永久阻塞

遵循「**发送方关闭、只关一次、关后不再发送**」三原则；多发送方场景用「单独 close goroutine + WaitGroup」或 `sync.Once` 保护。

### 10.5 用 `time.Sleep` 凑等待

```go
go doSomething()
time.Sleep(2 * time.Second) // ❌ 不可靠：可能不够，也可能浪费
```

修复：用 `WaitGroup`、channel 信号或 `errgroup` 做确定性同步。

### 10.6 循环变量捕获（回顾）

见第 3.2 节：Go 1.22 前必须 `i := i` 或传参；新版本虽已修复，传参仍是最佳实践。

### 10.7 最佳实践清单

- 并发访问共享状态 → `sync.Mutex`/`RWMutex` 或 `atomic`；优先「用 channel 通信」而非「共享内存 + 锁」。
- 一律 `go run -race` / `go test -race` 自检。
- `context` 作首个参数向下传，`defer cancel()` 必写。
- goroutine 生命周期要可被取消（context / done channel），杜绝泄漏。
- channel 关闭责任清晰，避免重复关闭。
- 限流用 worker pool，`errgroup` 管错误与取消。
- 不要在循环里用 `Sleep` 等待，用同步原语。

---

## 11. 综合实战：受限并发爬虫

把前面知识串起来：并发抓取多个 URL，**限制最大并发数 5**、**整体超时 10 秒**、**任一失败即取消其余请求**、**用 WaitGroup 等待完成**。

```go
package main

import (
    "context"
    "fmt"
    "golang.org/x/sync/errgroup"
    "net/http"
    "time"
)

// fetch 抓取单个 URL；通过 ctx 实现可取消
func fetch(ctx context.Context, url string) (string, error) {
    req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
    if err != nil {
        return "", err
    }
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return "", err
    }
    defer resp.Body.Close()
    return fmt.Sprintf("%s -> %d", url, resp.StatusCode), nil
}

func main() {
    urls := []string{
        "https://go.dev",
        "https://pkg.go.dev",
        "https://github.com",
        "https://example.com",
        "https://golang.google.cn",
        "https://go.dev/doc",
    }

    // 整体 10 秒超时
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    // errgroup + context：限制并发 5，任一失败取消全部
    g, gctx := errgroup.WithContext(ctx)
    g.SetLimit(5)

    for _, u := range urls {
        u := u
        g.Go(func() error {
            res, err := fetch(gctx, u)
            if err != nil {
                return err
            }
            fmt.Println("OK:", res)
            return nil
        })
    }

    if err := g.Wait(); err != nil {
        fmt.Println("抓取过程中出现错误（已取消其余任务）:", err)
        return
    }
    fmt.Println("全部抓取成功")
}
```

要点回顾：
- `errgroup.WithContext` 提供「错误即取消」的 `gctx`；
- `g.SetLimit(5)` 限制并发数（等价于 worker pool）；
- `http.NewRequestWithContext` 让底层连接随 ctx 取消而中断；
- `defer cancel()` 释放定时器，避免泄漏。

---

## 12. 参考文档

- [Go 官方首页](https://go.dev/)
- [Go 语言规范（Language Specification）](https://go.dev/ref/spec)
- [Go 标准库：sync](https://pkg.go.dev/sync)
- [Go 标准库：sync/atomic](https://pkg.go.dev/sync/atomic)
- [Go 标准库：context](https://pkg.go.dev/context)
- [Go 标准库：channel 相关（builtin）](https://pkg.go.dev/builtin)
- [errgroup（golang.org/x/sync）](https://pkg.go.dev/golang.org/x/sync/errgroup)
- [Go 并发模式（Go Blog: Pipelines）](https://go.dev/blog/pipelines)
- [Go 并发模式（Go Blog: Context）](https://go.dev/blog/context)
- [Go 内存模型（Memory Model，happens-before 规则）](https://go.dev/ref/mem)
- [Go 官方交互式教程 Tour of Go](https://tour.golang.org/concurrency/1)
- [Go by Example（中文：并发示例）](https://gobyexample-cn.github.io/)
- [Effective Go（官方风格指南）](https://go.dev/doc/effective_go)
- [Go 1.27 发布说明](https://go.dev/doc/go1.27)

> 说明：本文基于 Go **1.27**（最新稳定版，2026-08 发布）编写。其中类型化原子（`atomic.Int64` 等）自 Go 1.19 起提供，`sync.Mutex.TryLock` 自 Go 1.18 起提供，`for` 循环变量每轮独立自 Go 1.22 起生效；若后续版本有语法/API 变更，以官方 [Language Specification](https://go.dev/ref/spec) 与 [Go 文档总入口](https://go.dev/doc/) 为准。

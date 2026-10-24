---
title: Go Channel 学习文档
create:2026-10-21
update:2026-10-21
category:golang
cover:https://img-common.aknot.uk/cover/land-31.jpg
tags:[go,golang,channel,goroutine,concurrency,csp,select,pipeline,worker-pool]
summary:Go channel 从基础到进阶的完整学习文档，覆盖声明/缓冲/关闭/单向/select/超时/扇入扇出/Worker Pool/Pipeline/信号量限流/优雅退出/reflect.Select/死锁与泄漏排查，每节均含可直接运行的示例
keywords:[go,golang,channel,goroutine,concurrency,select,pipeline,worker-pool,csp]
top:1
copyright:true
---

# Go Channel 学习文档

> 适用版本：Go **1.27**（最新稳定版，2026-08 发布）。channel 的语义自 Go 1.0 起高度稳定，本文示例在 1.x 全系均可运行。
> 本文定位「并发核心」，从**基础概念 → 日常用法 → 高阶模式 → 排查实战**逐步递进，每节都配可直接 `go run` 的示例。
> 前置知识：建议先读 [go01_basic.md](./go01_basic.md) 了解 goroutine 基本概念。channel 是 goroutine 之间通信（而非共享内存）的**唯一**推荐方式。

---

## 目录

- [1. 并发模型：为什么需要 channel](#1-并发模型为什么需要-channel)
- [2. channel 基础：声明、创建与类型](#2-channel-基础声明创建与类型)
- [3. 发送与接收操作（阻塞语义）](#3-发送与接收操作阻塞语义)
- [4. 无缓冲 vs 缓冲 channel](#4-无缓冲-vs-缓冲-channel)
- [5. 关闭 channel 与接收的 ok 判断](#5-关闭-channel-与接收的-ok-判断)
- [6. 单向 channel（chan<- / <-chan）](#6-单向-channelchan--chan)
- [7. for-range 遍历 channel](#7-for-range-遍历-channel)
- [8. select 多路复用基础](#8-select-多路复用基础)
- [9. select + default（非阻塞通信）](#9-select--default非阻塞通信)
- [10. select + time.After（超时控制）](#10-select--timeafter超时控制)
- [11. nil channel 特性与禁用 case 技巧](#11-nil-channel-特性与禁用-case-技巧)
- [12. select 的随机性与公平性](#12-select-的随机性与公平性)
- [13. len(ch) / cap(ch) 与缓冲泄漏风险](#13-lench--capch-与缓冲泄漏风险)
- [14. 扇出 / 扇入（Fan-out / Fan-in）模式](#14-扇出--扇入fan-out--fan-in模式)
- [15. Worker Pool（协程池）模式](#15-worker-pool协程池模式)
- [16. Pipeline（流水线）模式](#16-pipeline流水线模式)
- [17. 信号量限流（Semaphore via channel）](#17-信号量限流semaphore-via-channel)
- [18. 优雅退出：done channel 与 context](#18-优雅退出done-channel-与-context)
- [19. WaitGroup 与 channel 配合](#19-waitgroup-与-channel-配合)
- [20. reflect.Select 动态多路复用](#20-reflectselect-动态多路复用)
- [21. 常见死锁、goroutine 泄漏及排查](#21-常见死锁goroutine-泄漏及排查)
- [22. 常见坑与最佳实践](#22-常见坑与最佳实践)
- [23. 参考文档](#23-参考文档)

---

## 1. 并发模型：为什么需要 channel

Go 的并发哲学是 **"不要通过共享内存来通信，而要通过通信来共享内存"**（Do not communicate by sharing memory; instead, share memory by communicating）。

- **goroutine**：轻量级用户态线程，由 Go runtime 调度，启动成本极低（初始栈仅 2KB）。
- **channel**：goroutine 之间传递数据的**类型化管道**，内置同步与阻塞语义，天然避免数据竞争。

对比两种并发风格：

| 方式 | 代表 | 风险 |
|------|------|------|
| 共享内存 + 锁 | `sync.Mutex` / `atomic` | 易死锁、易漏锁、难推理 |
| channel 通信 | `chan T` | 表达力强、组合性好、CSP 模型 |

```go
package main

import (
    "fmt"
    "time"
)

// 用 channel 把「计算结果」从子协程安全送到主协程
func main() {
    ch := make(chan string) // 无缓冲字符串通道

    go func() {
        time.Sleep(100 * time.Millisecond)
        ch <- "hello from goroutine" // 发送：会阻塞直到有人接收
    }()

    msg := <-ch // 接收：阻塞直到有人发送
    fmt.Println(msg)
}
```

> 小结：channel 既是**数据通道**，也是**同步点**。一个无缓冲 channel 的发送/接收，相当于一次「会合（rendezvous）」。

---

## 2. channel 基础：声明、创建与类型

channel 用 `chan T` 表示，T 是**传输元素的类型**（任意类型，包括 channel 自身，从而可构造高阶管道）。

| 操作 | 语法 | 说明 |
|------|------|------|
| 声明变量 | `var ch chan int` | 零值为 `nil` |
| 创建无缓冲 | `ch := make(chan int)` | 同步通道，收发互相等待 |
| 创建缓冲 | `ch := make(chan int, 3)` | 容量 3，满前发送不阻塞 |
| 发送 | `ch <- v` | 把 v 送入通道 |
| 接收 | `v := <-ch` | 从通道取值 |
| 接收并丢弃 | `<-ch` | 只同步、不取数据 |
| 关闭 | `close(ch)` | 标记通道不再发送 |

```go
package main

import "fmt"

func main() {
    // 1) 零值 channel（nil）：收发都永久阻塞，常用于 select 中「禁用」分支
    var nilCh chan int
    fmt.Println(nilCh == nil) // true

    // 2) 无缓冲 channel
    ch := make(chan int)
    go func() { ch <- 42 }()
    fmt.Println(<-ch) // 42

    // 3) 缓冲 channel：可先存后取
    buf := make(chan int, 2)
    buf <- 1
    buf <- 2
    fmt.Println(<-buf, <-buf) // 1 2（FIFO 顺序）

    // 4) channel 元素也可以是 channel（高阶用法，见后文）
    hub := make(chan chan int, 1)
    inner := make(chan int, 1)
    inner <- 99
    hub <- inner
    fmt.Println(<-<-hub) // 99：先取 inner，再取它的值
}
```

> 注意：`chan` 是**引用类型**，`make` 才真正分配底层循环队列；仅声明的 `nil` channel 不能收发。

---

## 3. 发送与接收操作（阻塞语义）

理解阻塞是掌握 channel 的关键：

- **无缓冲通道**：发送方阻塞，直到有接收方就绪；接收方阻塞，直到有发送方就绪。二者「同时握手」。
- **缓冲通道**：发送方仅在**队列满**时阻塞；接收方仅在**队列空且未关闭**时阻塞。

```go
package main

import (
    "fmt"
    "time"
)

// 演示：无缓冲通道的「会合」特性——先启动的发送会一直阻塞到主协程接收
func main() {
    ch := make(chan int) // 无缓冲

    go func() {
        fmt.Println("子协程准备发送")
        ch <- 100 // 阻塞：等待主协程走到 <-ch
        fmt.Println("子协程发送完成（说明会合发生）")
    }()

    time.Sleep(50 * time.Millisecond) // 模拟主协程先做点别的事
    v := <-ch
    fmt.Println("主协程收到:", v)
}
```

```go
package main

import "fmt"

// 演示：缓冲通道「满则阻塞、空则阻塞」
func main() {
    ch := make(chan int, 1)
    ch <- 1      // 成功，缓冲 1 个
    // ch <- 2   // 若取消注释：缓冲已满，主协程无人接收 → 死锁
    fmt.Println(<-ch) // 取走后，缓冲空
}
```

> 口诀：**无缓冲 = 强制同步；有缓冲 = 解耦生产与消费速度，但缓冲满/空仍会阻塞。**

---

## 4. 无缓冲 vs 缓冲 channel

| 维度 | 无缓冲 | 缓冲 |
|------|--------|------|
| 同步性 | 严格同步（会合） | 异步（直到缓冲满） |
| 适用场景 | 需要严格时序保证、信号通知 | 解耦生产者/消费者速度差 |
| 性能 | 每次收发都有调度切换 | 减少阻塞，提升吞吐 |
| 风险 | 易死锁（一方不收发） | 缓冲满死锁、缓冲泄漏 |

```go
package main

import (
    "fmt"
    "time"
)

// 信号通知：无缓冲通道天然适合「做完一件事再继续」
func worker(done chan struct{}) {
    fmt.Println("worker: 工作中...")
    time.Sleep(100 * time.Millisecond)
    done <- struct{}{} // 发信号：完成
}

func main() {
    done := make(chan struct{}) // 空结构体不占内存，最适合纯信号
    go worker(done)
    <-done // 阻塞等待 worker 完成
    fmt.Println("main: worker 已完成")
}
```

```go
package main

import (
    "fmt"
    "time"
)

// 解耦生产/消费：缓冲通道让生产者不必等消费者
func main() {
    ch := make(chan int, 5) // 容量 5

    // 生产者：快速灌入，不必等消费者
    go func() {
        for i := 0; i < 5; i++ {
            ch <- i
            fmt.Println("生产:", i)
        }
        close(ch)
    }()

    time.Sleep(200 * time.Millisecond) // 消费者慢
    for v := range ch {
        fmt.Println("消费:", v)
    }
}
```

---

## 5. 关闭 channel 与接收的 ok 判断

| 操作 | 行为 |
|------|------|
| `close(ch)` | 标记关闭，**只允许发送方关闭** |
| `<-ch`（已关闭） | 立即返回**零值**，不阻塞 |
| `v, ok := <-ch` | `ok == false` 表示已关闭且无剩余数据 |
| 向已关闭 channel 发送 | **panic** |
| 重复关闭 | **panic** |
| `close(nil)` | **panic** |

```go
package main

import "fmt"

// 用 ok 判断区分「收到零值」与「通道已关闭」
func main() {
    ch := make(chan int, 3)
    ch <- 10
    ch <- 0 // 这里的 0 是真实数据
    close(ch)

    for {
        v, ok := <-ch
        if !ok {
            fmt.Println("通道已关闭，停止读取")
            break
        }
        fmt.Println("读到:", v)
    }
}
```

```go
package main

import "fmt"

// 关闭原则：只有发送方关闭；多发送方场景用额外的 done/WaitGroup 协调
func main() {
    ch := make(chan int)

    go func() {
        for i := 0; i < 3; i++ {
            ch <- i
        }
        close(ch) // ✅ 唯一的发送方关闭
    }()

    // 等价写法：用 range 自动在关闭后退出
    for v := range ch {
        fmt.Println(v)
    }
}
```

> 铁律：**发送方负责关闭**。如果多个 goroutine 都发送，需要选一个「协调者」统一关闭，或改用 `sync.WaitGroup` 在所有发送完成后关闭（见 §19）。

---

## 6. 单向 channel（chan<- / <-chan）

Go 允许把双向 channel 限制为**只发送**或**只接收**，用于函数签名表达意图、防止误用。

- `chan<- T`：只发送（不能接收）
- `<-chan T`：只接收（不能发送）
- 双向 → 单向：**可隐式转换**（传参时自动）；单向 → 双向：**不可**转换。

```go
package main

import "fmt"

// 只发送：函数内部只能 ch <- v
func producer(out chan<- int) {
    for i := 0; i < 3; i++ {
        out <- i
    }
    close(out)
}

// 只接收：函数内部只能 <-ch
func consumer(in <-chan int) {
    for v := range in {
        fmt.Println("消费:", v)
    }
}

func main() {
    ch := make(chan int) // 双向
    go producer(ch)      // 自动转为 chan<- int
    consumer(ch)         // 自动转为 <-chan int
}
```

```go
package main

import "fmt"

// 错误示例（编译期即报错）：把只接收转成双向
// func bad(in <-chan int) chan int { return in } // ❌ cannot use in (type <-chan int) as type chan int

func main() {
    ch := make(chan int, 1)
    ch <- 1
    var onlyRecv <-chan int = ch // 双向赋给单向：OK
    fmt.Println(<-onlyRecv)
}
```

> 实践建议：在**函数参数**上尽量用单向类型，既防误用又能让调用者一眼看懂方向。

---

## 7. for-range 遍历 channel

`for v := range ch` 会持续接收，直到 **channel 被关闭**才退出。比手写 `v, ok := <-ch` 更简洁，**但前提是通道一定会被关闭**，否则永久阻塞。

```go
package main

import "fmt"

func main() {
    ch := make(chan int, 4)
    for i := 1; i <= 4; i++ {
        ch <- i * i
    }
    close(ch) // 必须关闭，range 才能结束

    sum := 0
    for v := range ch { // 自动接收直到关闭
        sum += v
    }
    fmt.Println("平方和:", sum) // 1+4+9+16 = 30
}
```

```go
package main

import (
    "fmt"
    "time"
)

// 错误示例：range 一个永不关闭的 channel 会饿死 main（演示用 select 超时兜底）
func main() {
    ch := make(chan int) // 永不关闭
    go func() {
        for i := 0; ; i++ {
            ch <- i
            time.Sleep(20 * time.Millisecond)
        }
    }()

    // 这里不能用裸 range（会永久阻塞），用 select 取 N 次
    for i := 0; i < 5; i++ {
        v := <-ch
        fmt.Println(v)
    }
}
```

---

## 8. select 多路复用基础

`select` 让一个 goroutine 同时**等待多个 channel 操作**，哪个先就绪就执行哪个分支；都未就绪则阻塞（除非有 `default`）。

```go
package main

import (
    "fmt"
    "time"
)

// 同时监听两个通道，谁先到数据就处理谁
func main() {
    c1 := make(chan string)
    c2 := make(chan string)

    go func() {
        time.Sleep(100 * time.Millisecond)
        c1 <- "来自 c1"
    }()
    go func() {
        time.Sleep(50 * time.Millisecond)
        c2 <- "来自 c2"
    }()

    for i := 0; i < 2; i++ {
        select {
        case msg1 := <-c1:
            fmt.Println(msg1)
        case msg2 := <-c2:
            fmt.Println(msg2)
        }
    }
}
```

```go
package main

import "fmt"

// 用 select 实现「同时收发」：一个通道收、另一个发
func main() {
    in := make(chan int, 3)
    out := make(chan int, 3)
    for i := 1; i <= 3; i++ {
        in <- i
    }
    close(in)

    for {
        select {
        case v, ok := <-in:
            if !ok {
                in = nil // 关闭后置 nil，禁用该 case（见 §11）
                continue
            }
            out <- v * 2
        case v, ok := <-out:
            if !ok {
                return
            }
            fmt.Println("结果:", v)
            if len(in) == 0 && in == nil {
                close(out)
            }
        }
    }
}
```

---

## 9. select + default（非阻塞通信）

加上 `default` 分支后，select **不再阻塞**：若所有 case 都未就绪，立即执行 `default`。常用于「试探性」收发、轮询、心跳。

```go
package main

import (
    "fmt"
    "time"
)

// 非阻塞发送：通道满时走 default，不卡住
func main() {
    ch := make(chan int, 1)
    ch <- 1

    select {
    case ch <- 2:
        fmt.Println("发送成功")
    default:
        fmt.Println("通道已满，丢弃本次发送") // 这里会走到这
    }
}
```

```go
package main

import (
    "fmt"
    "time"
)

// 非阻塞接收：没数据就做别的事
func main() {
    ch := make(chan int)

    select {
    case v := <-ch:
        fmt.Println("收到:", v)
    default:
        fmt.Println("暂无数据，继续做其它工作")
    }

    time.Sleep(10 * time.Millisecond)
}
```

> 非阻塞 select 是**背压控制**与**避免协程卡死**的常用手段。

---

## 10. select + time.After（超时控制）

`time.After(d)` 返回一个 `<-chan Time`，到时后发送当前时间。配合 `select` 实现**操作超时**，防止永久阻塞。

```go
package main

import (
    "fmt"
    "time"
)

// 给一个可能很慢的接收加上 200ms 超时
func main() {
    ch := make(chan string)

    go func() {
        time.Sleep(500 * time.Millisecond) // 模拟慢操作
        ch <- "结果"
    }()

    select {
    case res := <-ch:
        fmt.Println("成功:", res)
    case <-time.After(200 * time.Millisecond):
        fmt.Println("超时：放弃等待")
    }
}
```

```go
package main

import (
    "fmt"
    "time"
)

// 带超时的「请求 + 重试」骨架
func doRequest(timeout time.Duration) (string, error) {
    ch := make(chan string, 1)
    go func() {
        // 模拟远程调用
        time.Sleep(100 * time.Millisecond)
        ch <- "OK"
    }()

    select {
    case res := <-ch:
        return res, nil
    case <-time.After(timeout):
        return "", fmt.Errorf("请求超时")
    }
}

func main() {
    res, err := doRequest(200 * time.Millisecond)
    fmt.Println(res, err)
}
```

> ⚠️ `time.After` 每次都会创建一个新定时器，若在**高频循环**里使用且未被触发，定时器要到点才回收，可能堆积。高频场景应改用 `time.NewTimer` + `Stop()`（见 §22）。

---

## 11. nil channel 特性与禁用 case 技巧

- 对 **nil channel** 的发送/接收会**永久阻塞**。
- 在 `select` 中，**nil channel 的 case 永远不会被选中**——这正是「动态禁用某个分支」的标准技巧。

```go
package main

import (
    "fmt"
    "time"
)

// 用 nil 动态关停「接收分支」：处理完 in 后把它置 nil，select 就忽略它
func main() {
    in := make(chan int, 3)
    in <- 1
    in <- 2
    in <- 3
    close(in)

    out := make(chan int, 3)

    for {
        select {
        case v, ok := <-in:
            if !ok {
                in = nil // ✅ 关闭后置 nil，禁用该 case
                continue
            }
            out <- v * 10
        case v, ok := <-out:
            if !ok {
                return
            }
            fmt.Println(v)
            if in == nil {
                close(out) // in 已耗尽，关闭 out 让循环退出
            }
        }
    }
}
```

```go
package main

import (
    "fmt"
    "time"
)

// 经典场景：用一个可开关的「停止信号」通道（nil 时停止分支被禁用）
func main() {
    tick := time.NewTicker(50 * time.Millisecond)
    defer tick.Stop()
    stop := make(chan struct{})

    go func() {
        time.Sleep(120 * time.Millisecond)
        close(stop) // 触发停止
    }()

    for {
        select {
        case <-tick.C:
            fmt.Println("tick")
        case <-stop:
            fmt.Println("停止")
            return
        }
    }
}
```

---

## 12. select 的随机性与公平性

当 **多个 case 同时就绪**，`select` 会**伪随机**选择一个（不是按顺序、也不是优先级），避免某个 case 长期「饿死」。

```go
package main

import (
    "fmt"
    "time"
)

// 两个通道都就绪时，Go 随机挑选 —— 不会总是先选 c1
func main() {
    c1 := make(chan int, 1)
    c2 := make(chan int, 1)

    counts := map[string]int{}

    for i := 0; i < 1000; i++ {
        c1 <- 1
        c2 <- 2
        select {
        case <-c1:
            counts["c1"]++
        case <-c2:
            counts["c2"]++
        }
    }
    fmt.Println(counts) // 近似 {"c1":500,"c2":500}
    time.Sleep(10 * time.Millisecond)
}
```

> 推论：不要依赖 case 的书写顺序来表达优先级。`select` 里**没有优先级**概念，若需优先级可用嵌套 select + default 或多次轮询。

---

## 13. len(ch) / cap(ch) 与缓冲泄漏风险

- `len(ch)`：当前**已缓冲但未取出**的元素个数。
- `cap(ch)`：通道容量（创建时指定，不可变）。
- `len`/`cap` 对 channel 是并发安全的只读快照，常用于监控与背压判断。

```go
package main

import (
    "fmt"
    "time"
)

// 监控缓冲水位：接近满则放慢生产
func main() {
    ch := make(chan int, 10)

    go func() {
        for i := 0; i < 25; i++ {
            ch <- i
            fmt.Printf("生产 %d，缓冲 %d/%d\n", i, len(ch), cap(ch))
            time.Sleep(10 * time.Millisecond)
        }
        close(ch)
    }()

    time.Sleep(300 * time.Millisecond)
    for v := range ch {
        _ = v
    }
}
```

**缓冲泄漏风险**：创建了缓冲通道却**没人消费 / 没人关闭**，生产方一直 `ch <- v` 直到满后阻塞，整条链路卡死。务必保证「有生产就有消费」。

```go
package main

import (
    "fmt"
    "time"
)

// 反例：缓冲满且无人消费 → 主协程在 ch <- 11 处永久阻塞（运行会死锁）
func leakDemo() {
    ch := make(chan int, 10)
    for i := 0; i < 11; i++ {
        ch <- i // 第 11 次：缓冲已满，无接收方 → 阻塞
    }
    fmt.Println(<-ch)
}

func main() {
    _ = leakDemo // 仅定义不调用，避免真的死锁；读者可用 go run 单独验证
    time.Sleep(10 * time.Millisecond)
}
```

---

## 14. 扇出 / 扇入（Fan-out / Fan-in）模式

- **扇出（Fan-out）**：多个 goroutine 从**同一个**通道读取，并行处理，提升吞吐。
- **扇入（Fan-in）**：把**多个**通道的结果合并到**一个**通道。

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

// 扇出：3 个 worker 并发消费同一个 in 通道
func fanOut(in <-chan int, workers int) {
    var wg sync.WaitGroup
    for w := 0; w < workers; w++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            for v := range in { // 多个 goroutine 抢同一个 in，Go 保证每条消息只被一个消费
                fmt.Printf("worker%d 处理 %d\n", id, v)
                time.Sleep(20 * time.Millisecond)
            }
        }(w)
    }
    wg.Wait()
}

// 扇入：把多个输入通道合并到一个输出
func fanIn(chans ...<-chan int) <-chan int {
    out := make(chan int)
    var wg sync.WaitGroup
    for _, c := range chans {
        wg.Add(1)
        go func(c <-chan int) {
            defer wg.Done()
            for v := range c {
                out <- v
            }
        }(c)
    }
    go func() {
        wg.Wait()
        close(out) // 所有输入都结束后才关闭 out
    }()
    return out
}

func main() {
    in := make(chan int, 10)
    for i := 0; i < 6; i++ {
        in <- i
    }
    close(in)
    fanOut(in, 3)

    // 扇入示例
    a := make(chan int, 2)
    b := make(chan int, 2)
    a <- 1
    a <- 2
    b <- 3
    b <- 4
    close(a)
    close(b)
    for v := range fanIn(a, b) {
        fmt.Println("扇入收到:", v)
    }
}
```

---

## 15. Worker Pool（协程池）模式

固定数量的 worker 消费任务通道，既**限制并发数**又**复用协程**，是服务端最高频的并发模式之一。

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

type Job struct{ ID int }
type Result struct {
    JobID int
    Sum   int
}

// worker：从 jobs 取任务，算完写 results
func worker(id int, jobs <-chan Job, results chan<- Result, wg *sync.WaitGroup) {
    defer wg.Done()
    for j := range jobs {
        time.Sleep(30 * time.Millisecond) // 模拟耗时
        results <- Result{JobID: j.ID, Sum: j.ID * 2}
        fmt.Printf("worker%d 完成 job%d\n", id, j.ID)
    }
}

func main() {
    const numWorkers = 3
    jobs := make(chan Job, 10)
    results := make(chan Result, 10)

    var wg sync.WaitGroup
    for i := 1; i <= numWorkers; i++ {
        wg.Add(1)
        go worker(i, jobs, results, &wg)
    }

    // 投递任务
    for i := 1; i <= 9; i++ {
        jobs <- Job{ID: i}
    }
    close(jobs) // 投递完毕，关闭让 worker 退出 range

    wg.Wait()      // 等所有 worker 结束
    close(results) // 再关闭结果通道

    total := 0
    for r := range results {
        total += r.Sum
    }
    fmt.Println("全部完成，合计:", total)
}
```

> 要点：**先 `close(jobs)` 让 worker 自然退出 → `wg.Wait()` → 再 `close(results)`**，顺序错了会 panic 或漏读。

---

## 16. Pipeline（流水线）模式

把多个 stage 串成管道：每个 stage 是「接收上游 → 处理 → 发送至下游」的 goroutine，用 channel 连接。

```go
package main

import (
    "fmt"
    "sync"
)

// stage1：生成数字
func gen(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        for _, n := range nums {
            out <- n
        }
        close(out)
    }()
    return out
}

// stage2：平方
func square(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        for n := range in {
            out <- n * n
        }
        close(out)
    }()
    return out
}

// stage3：求和（用 WaitGroup 等待所有中间 goroutine，这里简单串行消费）
func main() {
    _ = sync.WaitGroup{} // 占位，强调 pipeline 各 stage 用 close 自然同步

    // 串成管道：gen -> square -> main
    for v := range square(gen(2, 3, 4)) {
        fmt.Println("平方结果:", v) // 4 9 16
    }
}
```

```go
package main

import "fmt"

// 复杂 pipeline：map → filter → reduce，全部基于 channel
func main() {
    in := make(chan int, 5)
    for i := 1; i <= 5; i++ {
        in <- i
    }
    close(in)

    // map: x2
    mapped := make(chan int, 5)
    go func() {
        for v := range in {
            mapped <- v * 2
        }
        close(mapped)
    }()

    // filter: 只保留 > 4
    filtered := make(chan int, 5)
    go func() {
        for v := range mapped {
            if v > 4 {
                filtered <- v
            }
        }
        close(filtered)
    }()

    sum := 0
    for v := range filtered {
        sum += v
    }
    fmt.Println("reduce 求和:", sum) // 6+8+10 = 24
}
```

---

## 17. 信号量限流（Semaphore via channel）

用**带缓冲 channel 的容量**充当信号量：进入临界区前 `acquire <- struct{}{}`，离开后 `<-release`，从而限制最大并发数。

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

// 并发受限的「访问数据库」：最多同时 3 个
func main() {
    const maxConcurrency = 3
    sem := make(chan struct{}, maxConcurrency) // 容量为 3 的信号量
    var wg sync.WaitGroup

    for i := 0; i < 10; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            sem <- struct{}{}        // 获取令牌（满则阻塞）
            defer func() { <-sem }() // 释放令牌

            fmt.Printf("任务%d 开始（并发=%d）\n", id, len(sem))
            time.Sleep(100 * time.Millisecond)
            fmt.Printf("任务%d 结束\n", id)
        }(i)
    }
    wg.Wait()
}
```

> 相比 `chan struct{}` 自制信号量，Go 官方还提供 `golang.org/x/sync/semaphore`（加权信号量），生产环境更推荐。本文聚焦标准库方案。

---

## 18. 优雅退出：done channel 与 context

长时间运行的 goroutine 必须能被**通知退出**，否则造成泄漏。`done channel` 是最朴素的取消信号；`context.Context` 是标准取消机制。

```go
package main

import (
    "fmt"
    "time"
)

// 用 done channel 通知子协程退出
func worker(done <-chan struct{}) {
    for {
        select {
        case <-done:
            fmt.Println("worker: 收到退出信号，清理后退出")
            return
        default:
            fmt.Println("worker: 工作中...")
            time.Sleep(50 * time.Millisecond)
        }
    }
}

func main() {
    done := make(chan struct{})
    go worker(done)

    time.Sleep(200 * time.Millisecond)
    close(done) // 广播退出（close 会被所有接收者立即感知）
    time.Sleep(50 * time.Millisecond)
}
```

```go
package main

import (
    "context"
    "fmt"
    "time"
)

// 用 context 取消：比 done channel 更标准，可携带超时/值
func workerCtx(ctx context.Context) {
    for {
        select {
        case <-ctx.Done():
            fmt.Println("worker: 上下文取消:", ctx.Err())
            return
        default:
            fmt.Println("worker: 处理中...")
            time.Sleep(50 * time.Millisecond)
        }
    }
}

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
    defer cancel()

    go workerCtx(ctx)
    time.Sleep(300 * time.Millisecond) // 等超时自然触发
}
```

> 经验法则：**需要传递取消/超时/跨 API 边界时优先 `context`**；仅在单个函数内简单同步时用 `done chan struct{}` 即可。

---

## 19. WaitGroup 与 channel 配合

`channel` 解决通信，`sync.WaitGroup` 解决「等一组 goroutine 全部完成」。二者常配合：channel 传数据，WaitGroup 等结束，最后由协调者 `close`。

```go
package main

import (
    "fmt"
    "sync"
)

// 多发送方：用 WaitGroup 等所有发送者完成，再统一关闭通道
func main() {
    ch := make(chan int, 10)
    var wg sync.WaitGroup

    senders := 3
    for s := 0; s < senders; s++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            for i := 0; i < 3; i++ {
                ch <- id*10 + i
            }
        }(s)
    }

    // 单独 goroutine 等待所有发送完成后关闭，避免「向已关闭通道发送」panic
    go func() {
        wg.Wait()
        close(ch)
    }()

    total := 0
    for v := range ch {
        total += v
    }
    fmt.Println("全部接收完毕，总和:", total)
}
```

> 多发送方场景**绝不能**由某个发送方自作主张 `close`，否则其它发送方可能 panic。统一交给 WaitGroup 协调关闭是标准解法。

---

## 20. reflect.Select 动态多路复用

当 **case 数量在编译期不确定**（如动态数量的 channel），无法写静态 `select`，可用 `reflect.Select` 在运行时构造。

```go
package main

import (
    "fmt"
    "reflect"
    "time"
)

// 动态监听任意数量的通道
func main() {
    // 构造 3 个通道
    chans := make([]chan int, 3)
    cases := make([]reflect.SelectCase, 3)
    for i := range chans {
        chans[i] = make(chan int, 1)
        chans[i] <- (i + 1) * 100
        cases[i] = reflect.SelectCase{
            Dir:  reflect.SelectRecv,        // 接收方向
            Chan: reflect.ValueOf(chans[i]), // 通道
        }
    }

    // 运行时选择一个就绪的 case
    chosen, recv, _ := reflect.Select(cases)
    fmt.Printf("选中的通道下标=%d，值=%v\n", chosen, recv.Interface())
    time.Sleep(10 * time.Millisecond)
}
```

```go
package main

import (
    "fmt"
    "reflect"
)

// 含 default 的动态 select（非阻塞）
func main() {
    ch := make(chan int) // 无数据
    cases := []reflect.SelectCase{
        {
            Dir:  reflect.SelectRecv,
            Chan: reflect.ValueOf(ch),
        },
        {
            Dir: reflect.SelectDefault, // 非阻塞兜底
        },
    }
    chosen, _, _ := reflect.Select(cases)
    fmt.Println("chosen =", chosen) // 1 表示走了 default
}
```

> `reflect.Select` 性能低于静态 `select`（有反射开销），仅在 case 数量动态时使用。

---

## 21. 常见死锁、goroutine 泄漏及排查

### 21.1 死锁（Deadlock）

所有 goroutine 都阻塞、无人推进时发生。Go runtime 检测到「所有 goroutine  asleep」会 **panic: all goroutines are asleep - deadlock**。

```go
package main

// 反例：主协程发到无缓冲通道，但无人接收 → 死锁
// func main() {
//     ch := make(chan int)
//     ch <- 1 // 永久阻塞，其它 goroutine 也无 → deadlock panic
// }
```

### 21.2 goroutine 泄漏（Leak）

goroutine 永远阻塞在 channel 操作上、且再也无法被唤醒，导致它和它引用的内存**无法回收**。

```go
package main

import (
    "fmt"
    "time"
)

// 反例：子协程等 ch，但没人会发/关 → 永久泄漏
func leak() {
    ch := make(chan int)
    go func() {
        <-ch // 永远等不到
    }()
    // 函数返回，ch 不可达，但子协程仍阻塞 → 泄漏
}

func main() {
    leak()
    fmt.Println("main 退出，但 leak 的子协程已泄漏")
    time.Sleep(10 * time.Millisecond)
}
```

### 21.3 排查手段

| 手段 | 用法 |
|------|------|
| `panic deadlock` | 编译/运行直接报，定位同步死锁 |
| `runtime.NumGoroutine()` | 打印协程数，观察是否只增不减 |
| `pprof` | `import _ "net/http/pprof"`，看 goroutine 堆栈 |
| `-race` | `go run -race` 检测数据竞争 |
| 超时兜底 | 所有 channel 等待都加 `select + time.After` |

```go
package main

import (
    "fmt"
    "runtime"
    "time"
)

// 用 NumGoroutine 观察泄漏：泄漏时数字不回落
func main() {
    fmt.Println("起始 goroutine:", runtime.NumGoroutine())
    go func() { <-make(chan int) }() // 泄漏一个
    time.Sleep(50 * time.Millisecond)
    fmt.Println("结束 goroutine:", runtime.NumGoroutine()) // 比起始多 1
}
```

---

## 22. 常见坑与最佳实践

### 22.1 高频坑

1. **向 nil channel 收发永久阻塞**（见 §2、§11）。
2. **向已关闭 / 重复关闭 channel**：发送或重复 `close` 会 **panic**，务必「只由发送方关闭」。
3. **多发送方各自 close**：互相 panic，用 WaitGroup 统一关闭（见 §19）。
4. **range 永不关闭的 channel**：主协程永久阻塞。
5. **缓冲满无人消费**：生产方卡死，链路整体 stall。
6. **`time.After` 在高频循环里不回收**：未触发的定时器到点才释放，可能堆积——改 `time.NewTimer` + `Stop()`。
7. **select 误以为有优先级**：多就绪 case 是随机的（见 §12）。
8. **关闭一个有接收者正 range 的 channel 后还发送**：发送会 panic。

### 22.2 最佳实践

- **方向表达**：函数参数尽量用 `chan<-` / `<-chan`，防误用、易读。
- **关闭责任**：明确「谁生产谁关闭」，多生产者用 WaitGroup 协调。
- **信号通道**：纯通知用 `chan struct{}`（零内存）。
- **超时必加**：任何可能阻塞的收发都配 `select + time.After` / `context`。
- **消费兜底**：有生产必有消费，避免缓冲泄漏。
- **限制并发**：用带缓冲 channel 当信号量，或 `golang.org/x/sync/semaphore`。
- **取消传播**：跨 API 边界用 `context.Context`，不要手搓 done channel 层层传。
- **监控**：生产服务暴露 `len(ch)` 水位，配合 `pprof` 排查泄漏。

### 22.3 time.After 正确写法（避免泄漏）

```go
package main

import (
    "fmt"
    "time"
)

// 高频循环里用 NewTimer 并显式 Stop，避免定时器堆积
func main() {
    for i := 0; i < 3; i++ {
        timer := time.NewTimer(100 * time.Millisecond)
        select {
        case <-timer.C:
            fmt.Println("到点", i)
        }
        // 这里已触发，仍需 Stop 以免资源滞留（未触发时更重要）
        if !timer.Stop() {
            <-timer.C // 已触发则排空，防止后续误读
        }
    }
}
```

---

## 23. 参考文档

- [Go 官方首页](https://go.dev/)
- [Go 语言规范 · Channel types](https://go.dev/ref/spec#Channel_types)
- [Go 语言规范 · Receive operator](https://go.dev/ref/spec#Receive_operator)
- [Go 语言规范 · Select statements](https://go.dev/ref/spec#Select_statements)
- [Go 标准库 · builtin（make/close/len/cap）](https://pkg.go.dev/builtin)
- [Go 标准库 · time（After / NewTimer / Ticker）](https://pkg.go.dev/time)
- [Go 标准库 · reflect（Select）](https://pkg.go.dev/reflect#Select)
- [Go 标准库 · sync（WaitGroup）](https://pkg.go.dev/sync)
- [Go 标准库 · context（取消与超时）](https://pkg.go.dev/context)
- [Go 标准库 · sync/atomic](https://pkg.go.dev/sync/atomic)
- [Go by Example（中文）：Channels](https://gobyexample-cn.github.io/examples/channels)
- [Go by Example（中文）：Select](https://gobyexample-cn.github.io/examples/select)
- [Go by Example（中文）：Worker Pools](https://gobyexample-cn.github.io/examples/worker-pools)
- [Go Concurrency Patterns（官方博客：Pipeline）](https://go.dev/blog/pipelines)
- [Go Concurrency Patterns（官方博客：Context）](https://go.dev/blog/context)
- [Effective Go · Concurrency](https://go.dev/doc/effective_go#concurrency)
- [Share Memory By Communicating（官方并发原则）](https://go.dev/doc/codewalk/sharemem/)
- [golang.org/x/sync/semaphore（加权信号量）](https://pkg.go.dev/golang.org/x/sync/semaphore)
- [Go 1.27 发布说明](https://go.dev/doc/go1.27)

> 说明：本文基于 Go **1.27**（最新稳定版，2026-08 发布）编写。channel / select 的语义自 Go 1.0 起高度稳定，示例在 1.x 全系均可运行；若后续版本有细微调整，以官方 [Language Specification](https://go.dev/ref/spec) 与 [Go 文档总入口](https://go.dev/doc/) 为准。进阶主题（context 深入、errgroup、atomic 无锁、并发安全数据结构）可结合上文链接进一步学习。

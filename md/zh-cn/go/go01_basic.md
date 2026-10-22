---
title: Go 语言基础学习文档
create:2026-10-21
update:2026-10-21
category:golang
tags:[go,golang,basic,datatype,function,slice,map,pointer,beginner]
summary:Go 语言基础学习文档，覆盖程序结构、基础数据类型、运算符、流程控制、函数（多返回值/闭包/defer/panic）、数组/切片/映射/指针，每节均含可运行示例
keywords:[go,golang,basic,datatype,slice,map,pointer,function]
top:1
copyright:true
---

# Go 语言基础学习文档

> 适用版本：Go **1.27**（最新稳定版，2026-08-19 发布；文档同时说明 1.26 起的新语法）。
> 本文定位「入门 / 初级」，聚焦**基础数据类型、基本语言结构、函数**三大块，每节都配可直接运行的示例。
> Go 是静态强类型、编译型语言，语法简洁、原生支持并发（goroutine/channel，本文先不展开，留待进阶篇）。

---

## 目录

- [1. 开发环境与第一个程序](#1-开发环境与第一个程序)
- [2. 程序结构（package / import / main / 可见性）](#2-程序结构package--import--main--可见性)
- [3. 变量与常量](#3-变量与常量)
- [4. 基础数据类型](#4-基础数据类型)
- [5. 类型转换（显式）](#5-类型转换显式)
- [6. 运算符](#6-运算符)
- [7. 流程控制](#7-流程控制)
- [8. 函数](#8-函数)
- [9. 数组 Array](#9-数组-array)
- [10. 切片 Slice](#10-切片-slice)
- [11. 映射 Map](#11-映射-map)
- [12. 指针 Pointer](#12-指针-pointer)
- [13. 零值（Zero Value）](#13-零值zero-value)
- [14. 格式化输入输出 fmt](#14-格式化输入输出-fmt)
- [15. 注释与文档](#15-注释与文档)
- [16. 常见坑与最佳实践](#16-常见坑与最佳实践)
- [17. 参考文档](#17-参考文档)

---

## 1. 开发环境与第一个程序

### 1.1 安装与版本

```bash
# 查看版本（本文示例基于 Go 1.27）
go version
# 输出形如：go version go1.27.3 darwin/arm64

# 设置模块代理（国内访问更快）
go env -w GOPROXY=https://goproxy.cn,direct
```

Go 采用**语义化版本 + 每半年一个大版本**（2 月 / 8 月）。当前（2026-10）稳定线为 **1.27**（1.26 仍受支持，1.25 已停止维护）。基础语法在各版本间高度稳定，本文示例在 1.x 全系均可运行。

### 1.2 工作区与模块

Go 用「模块（module）」管理依赖，每个项目根目录一个 `go.mod`。

```bash
mkdir hello && cd hello
go mod init example.com/hello   # 生成 go.mod
```

### 1.3 Hello World

```go
package main            // 包名；main 包是可执行程序的入口

import "fmt"            // 导入标准库 fmt（格式化 I/O）

func main() {           // 程序入口函数，无参数无返回值
    fmt.Println("Hello, 世界") // 打印并换行
}
```

```bash
go run main.go          # 编译并运行（不保留二进制）
go build main.go        # 编译生成可执行文件
./main                  # 运行
```

> Go 强制要求：导入的包必须被使用，声明的变量必须被使用，否则编译报错（这是 Go 的设计哲学：拒绝无用代码）。

---

## 2. 程序结构（package / import / main / 可见性）

### 2.1 package 与 import

```go
package main

import (
    "fmt"
    "math/rand"
    "time"
)

// 也可给包起别名，或为匿名导入（仅执行其 init）
import (
    crand "crypto/rand"      // 别名
    _ "net/http/pprof"       // 匿名导入：仅触发 init()，不显式使用
)
```

- `package main` 的 `main()` 是程序入口；其它包是库（被 import）。
- 一个目录只能有一个 `package`。

### 2.2 可见性规则（大小写决定）

Go **没有 `public/private` 关键字**，靠**标识符首字母大小写**决定：

```go
package utils

var Exported = "我能被其它包访问"   // 首字母大写 => 导出（public）
var unexported = "仅本包可见"      // 首字母小写 => 包内私有（private）

func DoSomething() {}              // 导出函数
func helper() {}                   // 私有函数
```

### 2.3 块的声明顺序无关

Go 允许前向引用，函数内可先使用后声明：

```go
func main() {
    fmt.Println(add(2, 3)) // 先调用
}

func add(a, b int) int {  // 后声明，合法
    return a + b
}
```

---

## 3. 变量与常量

### 3.1 变量声明

Go 有多种声明方式，最常用的是短声明 `:=`（仅函数内可用）。

```go
package main

import "fmt"

func main() {
    // 方式1：var + 类型（类型可省略，由初始值推断）
    var a int = 10
    var b = 20          // 类型推断为 int
    var c int           // 不初始化 => 零值 0

    // 方式2：短声明 :=（最常用，仅函数内部）
    d := 30

    // 方式3：批量声明（推荐用于分组）
    var (
        name string = "Go"
        age  int    = 15
    )

    fmt.Println(a, b, c, d, name, age)
}
```

### 3.2 常量与 iota

常量是编译期确定的值，用 `const`。`iota` 是预定义的常量计数器，常用于定义枚举。

```go
package main

import "fmt"

const Pi = 3.14159

// 枚举：iota 在 const 块中从 0 自增
const (
    Red   = iota // 0
    Green        // 1
    Blue         // 2
)

// 巧用 iota 做位移标志位
const (
    Read    = 1 << iota // 1  (001)
    Write               // 2  (010)
    Execute             // 4  (100)
)

func main() {
    fmt.Println(Red, Green, Blue)      // 0 1 2
    fmt.Println(Read|Write == 3)       // true（权限组合）
}
```

> 常量只能是数字、字符串、布尔、复数等基础类型；不能用 `:=` 声明常量。

---

## 4. 基础数据类型

Go 的基础类型分为四大类：**布尔、数值（整数/浮点/复数）、字符串、派生（指针/数组/结构体/函数/切片/映射/通道/接口）**。本节只讲前三类与派生里的数组/切片/映射/指针；结构体与接口留到进阶篇。

### 4.1 布尔 bool

```go
var t bool = true
f := false
fmt.Println(t && f, t || f, !t) // false true false
```

- 零值为 `false`。
- **Go 不允许把 bool 当 0/1 用**（不能 `if x == 1` 当布尔），也不能隐式转换。

### 4.2 整数

| 类型 | 位数 | 范围 |
|------|------|------|
| `int8`  | 8  | -128 ~ 127 |
| `uint8` / `byte` | 8  | 0 ~ 255 |
| `int16` | 16 | -32768 ~ 32767 |
| `uint16`| 16 | 0 ~ 65535 |
| `int32` / `rune` | 32 | ±21 亿 |
| `uint32`| 32 | 0 ~ 42 亿 |
| `int64` | 64 | ±9.2×10¹⁸ |
| `uint64`| 64 | 0 ~ 1.8×10¹⁹ |
| `int` / `uint` | 平台相关（64 位机为 64 位） | 推荐默认用 `int` |
| `uintptr` | 足够存指针 | 用于底层指针运算 |

```go
var i int = 42
var u uint8 = 255
var r rune = '中'      // rune 是 int32 别名，存 Unicode 码点
fmt.Printf("%c 的码点是 %d\n", r, r) // 中 的码点是 20013
```

> **建议**：除非需要精确位数（如二进制协议、文件格式），否则统一用 `int`。`byte` = `uint8`，`rune` = `int32`。

### 4.3 浮点数与复数

```go
var f32 float32 = 3.14
f64 := 3.141592653589793 // 默认推断为 float64（更精确，推荐）

z := 1 + 2i              // complex128
fmt.Println(real(z), imag(z)) // 1 2
```

- 浮点零值为 `0.0`。
- 金融计算**不要用 float**（精度问题），用 `math/big` 或整数「分」单位，后文有提示。

### 4.4 字符串 string

字符串是**不可变的字节序列**（默认 UTF-8）。

```go
s := "Hello, 世界"
fmt.Println(len(s))          // 13（len 统计字节数，中文 3 字节/字）
fmt.Println(s[0])            // 72（'H' 的 ASCII）
fmt.Println(s[7:])           // 世界（切片按字节）

// 遍历字符（rune）要按码点，而不是字节
for i, r := range s {
    fmt.Printf("%d:%c ", i, r)
}
// 0:H 1:e 2:l 3:l 4:o 5:, 6:  7:世 10:界

// 多行 / 原始字符串（反引号，不转义、可含换行）
sql := `SELECT *
FROM users
WHERE id = 1`
fmt.Println(sql)
```

常用字符串操作（标准库 `strings` / `strconv`）：

```go
import (
    "strconv"
    "strings"
)

func main() {
    s := "  Hello,Go  "
    fmt.Println(strings.TrimSpace(s))        // "Hello,Go"
    fmt.Println(strings.ToUpper(s))          // "  HELLO,GO  "
    fmt.Println(strings.Contains(s, "Go"))    // true
    fmt.Println(strings.Split("a,b,c", ","))  // [a b c]
    fmt.Println(strings.Join([]string{"a","b"}, "-")) // a-b

    n, _ := strconv.Atoi("123")              // 字符串->int
    str := strconv.Itoa(123)                 // int->字符串
    f, _ := strconv.ParseFloat("3.14", 64)   // 字符串->float64
    fmt.Println(n, str, f)
}
```

> 字符串不可变 → 大量拼接请用 `strings.Builder`（避免反复分配）。`+` 拼接小数据没问题，循环里拼接用 Builder。

---

## 5. 类型转换（显式）

Go **没有隐式类型转换**，不同类型必须显式转换（即使 `int` 与 `int64` 也不同型）。

```go
var i int = 42
var f float64 = float64(i)   // int -> float64
var u uint = uint(i)          // int -> uint

// 数字 <-> 字符串用 strconv（见 4.4）
s := strconv.Itoa(i)

// 错误示例（编译失败）：
// var x int = 3.14      ❌ 浮点不能赋给 int
// var y int8 = 1000     ❌ 越界
// var z int = int64(0)  ❌ int64 与 int 是不同类型，需 int(int64(0))
```

> 陷阱：`byte('A')` 得到 `65`（整数）；想从 `[]byte` 转回 `string` 用 `string(b)`，反之 `[]byte(s)`。

---

## 6. 运算符

### 6.1 算术 / 比较 / 逻辑

```go
a, b := 10, 3
fmt.Println(a+b, a-b, a*b, a/b, a%b) // 13 7 30 3 1（整数除法截断）

fmt.Println(a == b, a != b, a > b)   // false true true
fmt.Println(a > 0 && b > 0)          // true
fmt.Println(a > 0 || b < 0)          // true
fmt.Println(!true)                    // false
```

### 6.2 位运算

```go
x, y := 0b1100, 0b1010          // 二进制字面量
fmt.Println(x & y)              // 1000 (8)  与
fmt.Println(x | y)              // 1110 (14) 或
fmt.Println(x ^ y)              // 0110 (6)  异或
fmt.Println(x << 1)             // 11000 (24) 左移
fmt.Println(x >> 1)             // 110 (6)   右移
```

### 6.3 赋值与自增自减

```go
n := 5
n += 2          // 7
n *= 3          // 21
n++             // 22（只能是语句，不能 n = n++）
// 注意：Go 没有 --n / ++n 的前置写法，只有后置 n++ / n--
```

> Go 的 `++`/`--` 是**语句**而非表达式，不能写 `m := n++` 或 `if n++ > 0`。

---

## 7. 流程控制

### 7.1 if / else（条件无需括号，但 `{}` 强制）

```go
score := 85
if score >= 90 {
    fmt.Println("A")
} else if score >= 60 {
    fmt.Println("及格")
} else {
    fmt.Println("不及格")
}

// if 支持初始化语句（作用域限于 if 块）
if v := compute(); v > 0 {
    fmt.Println("正数", v)
}
// 这里访问 v 会报错（已超出作用域）
```

### 7.2 for —— Go 唯一的循环

Go **没有 while / do-while**，全部用 `for`：

```go
// 经典三段式
for i := 0; i < 3; i++ {
    fmt.Println(i)
}

// 类似 while（只有条件）
n := 3
for n > 0 {
    fmt.Println(n)
    n--
}

// 无限循环
for {
    // 通常配合 break
    break
}

// 遍历（range）：数组/切片/字符串/map/通道
nums := []int{10, 20, 30}
for idx, val := range nums {
    fmt.Println(idx, val)
}
// 只取值：for _, val := range nums
// 只取下标：for idx := range nums
```

### 7.3 switch —— 默认自动 break

```go
day := "Mon"
switch day {
case "Mon", "Tue", "Wed", "Thu", "Fri":
    fmt.Println("工作日")
case "Sat", "Sun":
    fmt.Println("周末")
default:
    fmt.Println("无效")
}

// 无表达式 switch（等价于 if-else 链）
score := 85
switch {
case score >= 90:
    fmt.Println("A")
case score >= 60:
    fmt.Println("及格")
default:
    fmt.Println("不及格")
}

// 类型 switch（对 interface{} 判断实际类型）—— 进阶常用
var i interface{} = "hello"
switch v := i.(type) {
case int:
    fmt.Println("int", v)
case string:
    fmt.Println("string", v)
default:
    fmt.Println("其它", v)
}
```

> Go 的 `case` **默认自带 break**，不会「贯穿」到下一个 case；若想贯穿用 `fallthrough`（极少用）。

### 7.4 break / continue / 标签

```go
// 用标签跳出多层循环
Outer:
for i := 0; i < 3; i++ {
    for j := 0; j < 3; j++ {
        if i*j == 4 {
            break Outer // 直接跳出外层
        }
    }
}
```

---

## 8. 函数

函数是 Go 的一等公民：可作为值传递、可作参数/返回值、可闭包。

### 8.1 基本定义与多返回值

Go 函数最显著特点是**原生支持多返回值**（常用于返回结果+错误）。

```go
// 两数相除，返回商和错误（Go 错误处理的标准范式）
func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, fmt.Errorf("除数不能为 0")
    }
    return a / b, nil
}

func main() {
    q, err := divide(10, 3)
    if err != nil {
        fmt.Println("出错:", err)
        return
    }
    fmt.Println("结果:", q)
}
```

### 8.2 命名返回值

返回值可以命名，相当于在函数体顶部声明了变量，可直接 `return`（裸返回）。

```go
func split(sum int) (x, y int) {
    x = sum * 4 / 9
    y = sum - x
    return // 裸返回，等价于 return x, y
}

func main() {
    fmt.Println(split(17)) // 7 10
}
```

> 命名返回值 + 裸返回在小函数里清爽，但大函数里可读性下降，慎用。

### 8.3 可变参数

```go
func sum(nums ...int) int { // ...int 表示任意个 int
    total := 0
    for _, n := range nums {
        total += n
    }
    return total
}

func main() {
    fmt.Println(sum(1, 2, 3))      // 6
    fmt.Println(sum())             // 0
    s := []int{4, 5, 6}
    fmt.Println(sum(s...))         // 15（切片展开传入）
}
```

### 8.4 函数作为值与闭包

```go
// 函数作为变量
var op func(int, int) int
op = func(a, b int) int { return a + b }
fmt.Println(op(2, 3)) // 5

// 闭包：函数捕获外部变量
func counter() func() int {
    count := 0
    return func() int {
        count++        // 捕获并修改外部 count
        return count
    }
}

func main() {
    c := counter()
    fmt.Println(c(), c(), c()) // 1 2 3（count 在闭包中保持状态）
}
```

### 8.5 defer —— 延迟调用

`defer` 把函数调用**推迟到外层函数返回前执行**，常用于释放资源（关文件、解锁）。

```go
func main() {
    defer fmt.Println("第 3 个执行（最后）")
    defer fmt.Println("第 2 个执行")
    fmt.Println("第 1 个执行")
}
// 输出顺序：1 -> 2 -> 3（defer 后进先出 LIFO）
```

```go
// 实战：打开文件后确保关闭
func readFile(path string) error {
    f, err := os.Open(path)
    if err != nil {
        return err
    }
    defer f.Close() // 函数返回前一定关闭，无论哪条路径
    // ... 读取 f
    return nil
}
```

> **defer 在 panic 时也会执行**，因此把清理逻辑放 defer 很安全。多个 defer 按 LIFO 顺序。

### 8.6 panic 与 recover

`panic` 中止程序；`recover` 在 `defer` 中捕获 panic，恢复执行（主要用于库边界兜底，业务错误请用 `error`）。

```go
func safeDivide(a, b int) (result int, err error) {
    defer func() {
        if r := recover(); r != nil {
            err = fmt.Errorf("panic 恢复: %v", r)
        }
    }()
    if b == 0 {
        panic("除零")
    }
    return a / b, nil
}

func main() {
    r, err := safeDivide(4, 0)
    fmt.Println(r, err) // 0 panic 恢复: 除零
}
```

> 经验法则：**可预期的错误用 `error` 返回；不可预期的编程 bug（如越界）才 panic**。库内部尽量 recover 后转成 error 返回给调用方。

---

## 9. 数组 Array

数组是**固定长度**的同类型序列，长度是类型的一部分。

```go
var a [3]int              // [0 0 0]，长度 3 是类型的一部分
b := [3]int{1, 2, 3}
c := [...]int{4, 5, 6}    // 让编译器推断长度（仍是数组，不是切片）
d := [5]int{1: 10, 3: 30} // 指定索引初始化：[0 10 0 30 0]

fmt.Println(len(a))       // 3
fmt.Println(a == b)       // false（数组可比较，需同长度同内容）

// 遍历
for i, v := range b {
    fmt.Println(i, v)
}
```

> 数组在 Go 里**很少直接传参**（传的是值拷贝，大数组昂贵）。实际几乎都用**切片**（下一节）。

---

## 10. 切片 Slice

切片是**动态数组**，是对底层数组的视图，是 Go 中最常用的集合类型。

### 10.1 创建与基本操作

```go
// 方式1：字面量
s := []int{1, 2, 3}

// 方式2：make（长度 5，容量 5）
s2 := make([]int, 5)

// 方式3：从数组/切片截取（左闭右开）
arr := [5]int{10, 20, 30, 40, 50}
sub := arr[1:4] // [20 30 40]

fmt.Println(len(s2))  // 长度 5
fmt.Println(cap(s2))  // 容量 5
```

### 10.2 append 与扩容

```go
var nums []int                // nil 切片，可直接 append
nums = append(nums, 1)
nums = append(nums, 2, 3)     // 一次追加多个
nums = append(nums, []int{4, 5}...) // 追加另一个切片

// 扩容机制：容量不足时按约 2 倍（小切片）或 1.25 倍（大切片）增长
s := make([]int, 0, 2)
for i := 0; i < 6; i++ {
    s = append(s, i)
    fmt.Println(len(s), cap(s)) // 观察容量变化：1/2 2/2 3/4 4/4 5/8 6/8
}
```

### 10.3 截取陷阱（共享底层数组）

```go
a := []int{1, 2, 3, 4, 5}
b := a[1:3]          // [2 3]
b[0] = 99           // 修改会影响 a！因为共享底层数组
fmt.Println(a)       // [1 99 3 4 5] ⚠️

// 若想完全独立的副本，用 copy 或 append 重建
c := make([]int, len(b))
copy(c, b)          // c 与 a 不再共享
```

### 10.4 删除元素（无内建 delete）

```go
// 删除索引 i 的元素（保持顺序）
s := []int{10, 20, 30, 40}
i := 2
s = append(s[:i], s[i+1:]...) // [10 20 40]
```

---

## 11. 映射 Map

Map 是**无序**的键值对（哈希表），键必须可比较（基础类型、string、指针等）。

### 11.1 声明、增删查

```go
// 声明并初始化
m := map[string]int{"a": 1, "b": 2}

// 用 make（更常见，先建空 map 再填）
scores := make(map[string]int)
scores["Alice"] = 95
scores["Bob"] = 88

// 读取（带「存在性」判断，避免零值歧义）
v, ok := scores["Alice"]
if ok {
    fmt.Println("Alice:", v)
}

// 删除
delete(scores, "Bob")

// 遍历（顺序随机，不要依赖）
for k, v := range scores {
    fmt.Println(k, v)
}
```

### 11.2 零值与并发

```go
var nilMap map[string]int       // nil map
// nilMap["x"] = 1              // ❌ panic：nil map 不能写
safe := make(map[string]int)    // 必须 make 才能写
safe["x"] = 1

// ⚠️ map 不是并发安全的！多 goroutine 同时读写会 fatal error
// 并发场景用 sync.Map 或加 sync.RWMutex（进阶篇）
```

> 判断 key 是否存在一定要用 `v, ok := m[k]`，因为「不存在」和「值为零值」都返回零值，无法区分。

---

## 12. 指针 Pointer

Go 有指针，但**不支持指针运算**（区别于 C），更安全。

```go
x := 10
p := &x            // & 取地址，p 的类型是 *int
fmt.Println(*p)    // * 解引用，得到 10
*p = 20            // 通过指针修改原值
fmt.Println(x)     // 20

// new 分配零值并返回指针
q := new(int)      // *int，指向值为 0 的内存
fmt.Println(*q)    // 0

// 函数内修改外部变量（传指针）
func inc(n *int) { *n++ }
func main() {
    n := 5
    inc(&n)
    fmt.Println(n)  // 6
}
```

> 指针零值是 `nil`。结构体方法常传指针以修改接收者（进阶篇讲）。一般用指针避免大对象拷贝。

---

## 13. 零值（Zero Value）

Go 变量声明即初始化为**零值**，无需手动赋值，这是 Go 安全性的来源之一。

| 类型 | 零值 |
|------|------|
| 数值（int/float/...） | `0` |
| 布尔 `bool` | `false` |
| 字符串 `string` | `""`（空串） |
| 指针 / 切片 / 映射 / 函数 / 通道 / 接口 | `nil` |
| 数组 | 每个元素为零值 |
| 结构体 | 每个字段为零值 |

```go
var i int
var s string
var p *int
var m map[string]int
fmt.Println(i, s, p, m) // 0  <nil> map[]
// 注意：m 是 nil map，需要 make 后才能写入
```

---

## 14. 格式化输入输出 fmt

`fmt` 是标准库核心包，格式化动词如下：

```go
name := "Go"
age := 15
pi := 3.14159

fmt.Printf("%s 已经 %d 岁了，π=%.2f\n", name, age, pi) // Go 已经 15 岁了，π=3.14
fmt.Printf("%T\n", age)     // int（打印类型）
fmt.Printf("%v\n", struct{}{}) // 默认格式（最常用）
fmt.Printf("%#v\n", m)      // Go 语法表示（调试利器）
fmt.Printf("%d in hex = %x\n", 255, 255) // 255 in hex = ff
```

常用动词：

| 动词 | 含义 |
|------|------|
| `%v` | 默认格式 |
| `%T` | 类型 |
| `%d` | 十进制整数 |
| `%x` / `%X` | 十六进制 |
| `%f` | 浮点 |
| `%.2f` | 保留 2 位小数 |
| `%s` | 字符串 |
| `%c` | 字符（rune） |
| `%p` | 指针地址 |
| `%q` | 带引号的字符串/字符 |
| `%t` | 布尔 |

输入：

```go
var name string
var age int
fmt.Print("请输入姓名和年龄：")
fmt.Scan(&name, &age)     // 按空格分隔读入，传指针
fmt.Printf("你好 %s，%d 岁\n", name, age)
```

---

## 15. 注释与文档

```go
// 单行注释

/*
多行注释
可以跨行
*/

// 导出的标识符紧邻的注释会自动成为文档（godoc）
// 运行：`go doc fmt.Println` 查看
```

> Go 约定：包/函数/类型上方的注释**首句以被注释的名字开头**，这样 `go doc` 与 pkg.go.dev 能自动生成漂亮文档。

---

## 16. 常见坑与最佳实践

### 16.1 新手高频坑

1. **导入未使用 / 变量未使用 → 编译失败**。删除或加 `_ = x` 占位。
2. **for 循环里取 `v` 地址**：
   ```go
   var ptrs []*int
   for _, v := range []int{1, 2, 3} {
       ptrs = append(ptrs, &v) // ❌ 全是同一个 v 的地址
   }
   // 正确：v := v; ptrs = append(ptrs, &v)
   ```
3. **map 并发读写崩溃**：多协程下用 `sync.Map` 或加锁。
4. **切片截取共享底层数组**（见 10.3），误改污染原切片。
5. **`range` 复用变量**：Go 1.22 起每次迭代是新变量，旧版本需 `v := v` 复制（现版本已修复）。
6. **数字比较用 `==` 但浮点有精度问题**：`0.1+0.2 == 0.3` 为 `false`，用误差比较。
7. **字符串用 `+` 在循环里大量拼接性能差**：用 `strings.Builder`。

### 16.2 最佳实践

- 默认用 `int`，别滥用定长整数类型。
- 错误处理优先 `error` 返回值，少用 `panic`。
- 资源（文件/连接）一律 `defer` 关闭。
- 函数多返回值最后一个通常是 `error`，调用方务必检查。
- 公共 API 注释写清楚；内部逻辑靠命名而非注释。
- 金融/精确计算不用 `float64`，用整数「分」或 `math/big`。

---

## 17. 参考文档

- [Go 官方首页](https://go.dev/)
- [Go 语言规范（Language Specification）](https://go.dev/ref/spec)
- [Go 标准库文档（pkg.go.dev）](https://pkg.go.dev/std)
- [Go 入门教程（Tour of Go，官方交互式）](https://tour.golang.org/welcome/1)
- [Go by Example（中文：示例式入门）](https://gobyexample-cn.github.io/)
- [Effective Go（官方风格指南）](https://go.dev/doc/effective_go)
- [Go 1.27 发布说明](https://go.dev/doc/go1.27)
- [Go 1.26 发布说明](https://go.dev/doc/go1.26)
- [Go 格式化动词 fmt 文档](https://pkg.go.dev/fmt)
- [Go 模块（go mod）使用指南](https://go.dev/doc/modules/managing-dependencies)

> 说明：本文基于 Go **1.27**（最新稳定版，2026-08 发布）编写。Go 基础语法在各版本间高度稳定；若后续版本有语法变更，以官方 [Language Specification](https://go.dev/ref/spec) 与 [Go 文档总入口](https://go.dev/doc/) 为准。进阶主题（结构体、方法、接口、goroutine、channel、error 包装、泛型）将在后续 `go02_*` 文档展开。

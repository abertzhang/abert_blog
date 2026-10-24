---
title: Go 标准库（内置库）学习文档
create:2026-10-23
update:2026-10-23
category:golang
cover:https://img-common.aknot.uk/cover/land-58.jpg
tags:[go,golang,stdlib,standard-library,fmt,strings,net-http,sync,json,concurrent]
summary:Go 语言标准库（内置库）完整学习文档（基于 Go 1.27），覆盖导入路径约定与标准库全景，逐个讲解 fmt/strings/strconv/time/math/sort/errors/log/encoding-json/encoding/bufio/io/os/path/flag/bytes/context/sync/atomic/net-http/net-url/net/hash-crypto/compress/os-exec/os-signal/reflect/testing/runtime/embed/container/template/iter 等常用与进阶内置库，每个库均给出尽量齐全的接口清单与可直接运行的示例
keywords:[go,golang,stdlib,standard-library,net-http,sync,json,context,goroutine,concurrency,fmt]
top:1
copyright:true
---

# Go 标准库（内置库）学习文档

> 适用版本：**Go 1.27.3**（2026-10-20 发布，Stable）。本文示例以 **Go 1.27** 为准，关键处标注版本门槛（如 `slices`/`maps` 需 Go 1.21+，`cmp` 需 1.21+，`iter` 迭代器需 1.23+，`encoding/json/v2` 与 `uuid` 为 1.27 新增）。
> Go 的标准库以「**稳定、克制、开箱即用**」著称，覆盖了网络、加密、文本、并发、测试等绝大多数日常需求，是 Go「少依赖」哲学的根基。本文从 **标准库全景 → 高频包深讲 → 进阶包速查 → 常见坑** 逐步递进，所有示例均为可独立 `go run` 的完整片段（省略 `package main` / `import` 处会注明）。

---

## 目录

- [1. 标准库全景与导入约定](#1-标准库全景与导入约定)
- [2. `fmt` 格式化 I/O](#2-fmt-格式化-io)
- [3. `strings` 字符串处理](#3-strings-字符串处理)
- [4. `strconv` 类型转换](#4-strconv-类型转换)
- [5. `time` 时间与周期](#5-time-时间与周期)
- [6. `math` / `math/rand` / `math/big`](#6-math--mathrand--mathbig)
- [7. `sort` / `slices` / `maps` / `cmp`](#7-sort--slices--maps--cmp)
- [8. `errors` 错误处理](#8-errors-错误处理)
- [9. `log` / `log/slog` 日志](#9-log--logslog-日志)
- [10. `encoding/json` 序列化](#10-encodingjson-序列化)
- [11. `encoding`（xml / csv / base64 / hex）](#11-encodingxml--csv--base64--hex)
- [12. `regexp` 正则](#12-regexp-正则)
- [13. `bufio` 缓冲 I/O](#13-bufio-缓冲-io)
- [14. `io` 与 `io/ioutil`](#14-io-与-ioioutil)
- [15. `os` 操作系统接口](#15-os-操作系统接口)
- [16. `path` 与 `path/filepath`](#16-path-与-pathfilepath)
- [17. `flag` 命令行参数](#17-flag-命令行参数)
- [18. `bytes` 字节操作](#18-bytes-字节操作)
- [19. `context` 上下文](#19-context-上下文)
- [20. `sync` 同步原语](#20-sync-同步原语)
- [21. `sync/atomic` 原子操作](#21-syncatomic-原子操作)
- [22. `net/http` HTTP 服务与客户端](#22-nethttp-http-服务与客户端)
- [23. `net/url` 与 `net`](#23-neturl-与-net)
- [24. `hash` 与 `crypto` 哈希/加解密](#24-hash-与-crypto-哈希加解密)
- [25. `compress`（gzip / zlib）](#25-compressgzip--zlib)
- [26. `os/exec` 执行命令](#26-osexec-执行命令)
- [27. `os/signal` 信号与优雅退出](#27-ossignal-信号与优雅退出)
- [28. `reflect` 反射](#28-reflect-反射)
- [29. `testing` 测试](#29-testing-测试)
- [30. `runtime` 运行时](#30-runtime-运行时)
- [31. `embed` 嵌入静态资源](#31-embed-嵌入静态资源)
- [32. `container`（list / heap / ring）](#32-containerlist--heap--ring)
- [33. `text/template` / `html/template`](#33-texttemplate--htmltemplate)
- [34. `iter` 迭代器（Go 1.23+）](#34-iter-迭代器go-123)
- [35. `unicode` / `unicode/utf8`](#35-unicode--unicodeutf8)
- [36. 常见坑与最佳实践](#36-常见坑与最佳实践)
- [37. 参考文档](#37-参考文档)

---

## 1. 标准库全景与导入约定

Go 标准库包通过**全限定导入路径**引用，核心包直接用短路径（如 `fmt`、`os`），子包用 `/`（如 `net/http`、`encoding/json`）。第三方包通常是域名反向路径（如 `github.com/gin-gonic/gin`）。

```go
import (
    "fmt"            // 核心内置
    "net/http"       // 子包：HTTP
    "encoding/json"  // 子包：JSON
    "math/rand/v2"   // v2 包（Go 1.22+ 推荐）
)
```

### 常用包按用途分组

| 用途 | 包 | 关键能力 |
|---|---|---|
| 格式化 I/O | `fmt` | 打印、扫描、错误格式化 |
| 字符串 | `strings` `strconv` `unicode/utf8` | 拼接、分割、转换、UTF-8 |
| 时间 | `time` | 时间、周期、定时器 |
| 数学 | `math` `math/rand` `math/big` | 数学、随机、大整数 |
| 集合 | `sort` `slices` `maps` `cmp` | 排序、切片/映射工具 |
| 错误 | `errors` | 错误创建、包装、判断 |
| 日志 | `log` `log/slog` | 文本/结构化日志 |
| 序列化 | `encoding/json` `encoding/xml` `encoding/csv` | 编解码 |
| I/O | `io` `bufio` `bytes` `os` | 读写、缓冲 |
| 文件系统 | `os` `path` `path/filepath` `embed` | 文件、路径、嵌入 |
| 参数 | `flag` `os` | 命令行 |
| 并发 | `sync` `sync/atomic` `context` | 锁、原子、取消 |
| 网络 | `net/http` `net/url` `net` | HTTP、URL、TCP |
| 加密 | `crypto/*` `hash` | 哈希、签名、随机 |
| 压缩 | `compress/gzip` `archive/zip` | 压缩 |
| 进程 | `os/exec` `os/signal` `runtime` | 命令、信号、运行时 |
| 反射 | `reflect` | 运行时类型 |
| 测试 | `testing` | 单元/基准测试 |
| 模板 | `text/template` `html/template` | 文本生成 |

> **铁律**：标准库优先于第三方。能用 `net/http` 就别急着引框架；能用 `slices.Contains` 就别手写循环。Go 1.27 的 `encoding/json/v2` 性能更好，新项目可考虑。

---

## 2. `fmt` 格式化 I/O

格式化动词：`%v`（默认）、`%+v`（含字段名）、`%#v`（Go 语法）、`%T`（类型）、`%d`/`%b`/`%o`/`%x`（整数）、`%f`/`%e`/`%g`（浮点）、`%s`（字符串）、`%q`（带引号）、`%p`（指针）、`%t`（布尔）。

```go
package main

import "fmt"

func main() {
    name := "Go"
    age := 15
    // 打印
    fmt.Print("hi")            // 直接打印
    fmt.Println(name, age)     // 换行
    fmt.Printf("%s is %d\n", name, age)
    s := fmt.Sprintf("%.2f", 3.14159) // 返回字符串
    e := fmt.Errorf("read failed: %w", err) // 包装错误（见 §8）

    // 扫描输入
    var x int
    var y string
    fmt.Sscanf("12 hello", "%d %s", &x, &y)
    fmt.Scanln(&x, &y) // 从 stdin 读取
}
```

常用函数：`Print` / `Printf` / `Println` / `Sprint` / `Sprintf` / `Fprintf`（写 `io.Writer`）/ `Errorf` / `Scan` / `Scanf` / `Sscanf`。

---

## 3. `strings` 字符串处理

```go
import "strings"

s := "  Hello, 世界  "
strings.TrimSpace(s)             // 去两端空白
strings.ToUpper(s)                // 大写
strings.Contains(s, "世界")        // true
strings.HasPrefix(s, "  He")       // true
strings.HasSuffix(s, "界  ")        // true
strings.Index(s, "世界")            // 字节索引
strings.Split("a,b,c", ",")        // []string{"a","b","c"}
strings.SplitAfter("a/b", "/")     // ["a/","b"]
strings.Join([]string{"a","b"}, "-") // "a-b"
strings.ReplaceAll(s, "l", "L")     // 全部替换
strings.Repeat("ab", 3)             // "ababab"
strings.Count(s, "l")               // 计数
strings.EqualFold("GO", "go")       // 忽略大小写比较 true
strings.TrimPrefix(s, "  ")         // 去前缀

// 高效拼接（循环里用 Builder 而非 +）
var b strings.Builder
for i := 0; i < 3; i++ {
    b.WriteString("go")
}
result := b.String() // "gogogo"
```

> **坑**：`strings.Index` 返回**字节**索引，对多字节（中文）字符需用 `utf8` 相关处理。循环拼接优先 `strings.Builder`（只分配一次底层数组）。

---

## 4. `strconv` 类型转换

```go
import "strconv"

i, err := strconv.Atoi("42")           // string→int
s := strconv.Itoa(42)                  // int→string
n, _ := strconv.ParseInt("ff", 16, 64)  // 16 进制解析 → 255
f, _ := strconv.ParseFloat("3.14", 64)  // string→float64
b, _ := strconv.ParseBool("true")       // string→bool
strconv.FormatInt(255, 16)             // → "ff"
strconv.FormatFloat(3.14, 'f', 2, 64)  // → "3.14"
strconv.Quote("a\"b")                  // → "\"a\\\"b\""
strconv.Unquote("\"hi\"")              // → hi
strconv.IntSize                        // 当前平台 int 位数（64）
```

> 数字↔字符串转换优先 `strconv`，比 `fmt.Sprintf` 更快；`Atoi`/`Itoa` 是 `ParseInt`/`FormatInt` 的便捷封装。

---

## 5. `time` 时间与周期

```go
import (
    "time"
    "fmt"
)

now := time.Now()
later := now.Add(2 * time.Hour)     // 加 2 小时
d := later.Sub(now)                  // Duration = 2h0m0s
fmt.Println(now.Year(), now.Month(), now.Day())
fmt.Println(now.Weekday())

// 格式化必须用参考时间 2006-01-02 15:04:05
t, _ := time.Parse("2006-01-02", "2026-10-23")
fmt.Println(t.Format("2006-01-02 15:04:05"))
fmt.Println(time.Now().Format(time.RFC3339)) // ISO8601

// 定时器
time.Sleep(100 * time.Millisecond)
<-time.After(1 * time.Second)        // 1 秒后收到值

// 周期执行
tick := time.NewTicker(500 * time.Millisecond)
defer tick.Stop()
for i := 0; i < 3; i++ {
    <-tick.C // 每 500ms 一次
}

// 一次性定时器
timer := time.NewTimer(2 * time.Second)
<-timer.C

// 时区
loc, _ := time.LoadLocation("Asia/Shanghai")
shanghai := now.In(loc)
```

关键类型：`Time`、`Duration`、`Location`、`Timer`、`Ticker`；方法：`Add`/`Sub`/`Before`/`After`/`Equal`/`Format`/`Parse`/`Unix`/`In`。

> **铁律**：Go 时间格式**不用**占位符 `%Y%m%d`，而是用参考时间 `Mon Jan 2 15:04:05 MST 2006` 的对应布局。记不住就背 `2006-01-02 15:04:05`。

---

## 6. `math` / `math/rand` / `math/big`

```go
import (
    "math"
    "math/rand/v2" // Go 1.22+ 推荐 v2（更快、更优 API）
    "math/big"
)

math.Max(1.0, 2.0)
math.Abs(-3.14)
math.Floor(3.7) // 3
math.Ceil(3.2)  // 4
math.Pow(2, 10) // 1024
math.Sqrt(16)   // 4
math.Pi

// 随机（v2）
r := rand.New(rand.NewPCG(1, 2)) // 可重现随机源
n := r.IntN(100)                 // [0,100)
f := r.Float64()                 // [0,1)
pick := r.IntN(10) == 0

// 大整数（密码学、超大数）
a := big.NewInt(1)
b := new(big.Int).Exp(big.NewInt(2), big.NewInt(100), nil) // 2^100
b.Add(b, a)
```

> **坑**：`math/rand` 的 v1 全局函数已弃用，且**默认不加密**；生成密钥/令牌请用 `crypto/rand`（见 §24），绝不用 `math/rand` 做安全用途。

---

## 7. `sort` / `slices` / `maps` / `cmp`

```go
import (
    "sort"
    "slices"
    "maps"
    "cmp"
    "fmt"
)

nums := []int{3, 1, 2}
sort.Ints(nums)              // 原地升序
sort.Slice(nums, func(i, j int) bool { return nums[i] > nums[j] }) // 自定义降序

// Go 1.21+ 的 slices 包（更直观）
slices.Sort(nums)
slices.SortFunc(nums, func(a, b int) int { return cmp.Compare(b, a) }) // 降序
if slices.Contains(nums, 2) { /* ... */ }
idx := slices.Index(nums, 2)
slices.Max(nums); slices.Min(nums)
slices.Reverse(nums)
slices.Compact(nums) // 去相邻重复

// maps（Go 1.21+）
m := map[string]int{"a": 1, "b": 2}
keys := slices.Sorted(maps.Keys(m)) // 有序遍历
maps.Clone(m)
maps.DeleteFunc(m, func(k string, v int) bool { return v < 2 })

// cmp 比较
cmp.Compare(1, 2) // -1
cmp.Less("a", "b")
```

> 推荐 `slices`/`maps` 包替代手写循环；`cmp.Compare`/`cmp.Less` 统一比较逻辑，避免重复写三态比较。

---

## 8. `errors` 错误处理

```go
import (
    "errors"
    "fmt"
)

// 创建
err := errors.New("something wrong")
err2 := fmt.Errorf("wrap: %w", err) // 包装（保留链路）

// 判定（Go 1.13+）
if errors.Is(err2, err) { /* true，沿链路匹配 */ }

// 类型提取
var pathErr *os.PathError
if errors.As(err, &pathErr) { fmt.Println(pathErr.Path) }

// 自定义错误类型
type MyErr struct{ Code int }
func (e *MyErr) Error() string { return fmt.Sprintf("code=%d", e.Code) }

// 不包装（无 %w）则 errors.Is 无法匹配
_ = err2
```

> **铁律**：包装用 `%w`（不是 `%v`）才能被 `errors.Is`/`As` 识别；错误判定优先 `errors.Is` 而非字符串比较。

---

## 9. `log` / `log/slog` 日志

```go
import (
    "log"
    "log/slog"
    "os"
)

// 基础 log
log.SetFlags(log.LstdFlags | log.Lshortfile)
log.Println("info")
log.Printf("value=%d", 1)
log.Fatal("fatal then exit") // 打印后 os.Exit(1)

// 结构化日志（Go 1.21+ slog，推荐）
logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
logger.Info("request", "method", "GET", "path", "/api", "status", 200)
logger.Error("db failed", "err", err, "retry", 3)
slog.SetDefault(logger) // 设为默认
```

> 生产环境用 `slog`（结构化、可换 handler），便于日志采集；裸 `log` 适合脚本与调试。

---

## 10. `encoding/json` 序列化

```go
import (
    "encoding/json"
    "fmt"
)

type User struct {
    Name  string `json:"name"`
    Age   int    `json:"age,omitempty"` // 零值省略
    Email string `json:"-"`            // 不序列化
}

// 序列化
u := User{Name: "Alice", Age: 30}
b, _ := json.Marshal(u)              // → {"name":"Alice","age":30}
pretty, _ := json.MarshalIndent(u, "", "  ")

// 反序列化
var u2 User
json.Unmarshal(b, &u2)

// 流式（大对象用 Encoder/Decoder 省内存）
enc := json.NewEncoder(os.Stdout)
enc.Encode(u)
dec := json.NewDecoder(r)
dec.Decode(&u2)

// 未知结构用 map / any
var raw map[string]any
json.Unmarshal(b, &raw)
```

> **坑**：字段必须**导出**（首字母大写）才能被 `json` 包访问；`time.Time` 默认用 RFC3339 序列化；Go 1.27 可尝试 `encoding/json/v2`（更严格、更快）。

---

## 11. `encoding`（xml / csv / base64 / hex）

```go
import (
    "encoding/base64"
    "encoding/csv"
    "encoding/hex"
    "encoding/xml"
)

// base64
enc := base64.StdEncoding.EncodeToString([]byte("hello"))
dec, _ := base64.StdEncoding.DecodeString(enc)

// hex
h := hex.EncodeToString([]byte("ab"))
raw, _ := hex.DecodeString(h)

// xml
type Note struct {
    XMLName xml.Name `xml:"note"`
    To      string   `xml:"to"`
    Body    string   `xml:"body"`
}
x, _ := xml.Marshal(Note{To: "me", Body: "hi"})

// csv
w := csv.NewWriter(os.Stdout)
w.Write([]string{"a", "b", "c"})
w.Flush()
```

---

## 12. `regexp` 正则

```go
import "regexp"

re := regexp.MustCompile(`\d+`)       // MustCompile 编译失败直接 panic
re.MatchString("abc123")               // true
re.FindString("abc123def")             // "123"
re.FindAllString("a1b2c3", -1)         // ["1","2","3"]
m := re.FindStringSubmatch("id:42")    // 带分组捕获
re.ReplaceAllString("a1b2", "#")       // "a#b#"
re.Split("a1b2c3", -1)                 // ["a","b","c"]

// 命名分组
re2 := regexp.MustCompile(`(?P<year>\d{4})-(?P<month>\d{2})`)
mm := re2.FindStringSubmatch("2026-10")
// mm["year"] == "2026"
```

> **坑**：正则编译有开销，**不要在循环里 `regexp.Compile`**；生产固定正则用包级 `var re = regexp.MustCompile(...)`。

---

## 13. `bufio` 缓冲 I/O

```go
import (
    "bufio"
    "os"
    "strings"
)

// 按行读取大文件（高效）
f, _ := os.Open("big.log")
defer f.Close()
sc := bufio.NewScanner(f)
sc.Buffer(make([]byte, 0, 64*1024), 1024*1024) // 调大缓冲防长行
for sc.Scan() {
    line := sc.Text()
    _ = line
}
if err := sc.Err(); err != nil { /* ... */ }

// 缓冲写
bw := bufio.NewWriter(os.Stdout)
bw.WriteString("hello")
bw.Flush() // 必须 Flush，否则数据留在缓冲

// 缓冲读
br := bufio.NewReader(strings.NewReader("hello"))
b, _ := br.ReadByte()
```

---

## 14. `io` 与 `io/ioutil`

`io/ioutil` 在 Go 1.16 起已废弃，功能迁移到 `io` 与 `os`。

```go
import (
    "io"
    "os"
)

// 读取全部（替代 ioutil.ReadAll）
data, _ := io.ReadAll(r)

// 拷贝（替代 ioutil.Copy）
io.Copy(dst, src)

// 读整个文件 / 写（替代 ioutil.ReadFile/WriteFile）
b, _ := os.ReadFile("a.txt")
os.WriteFile("b.txt", b, 0644)

// 包装 reader 为 ReadCloser
rc := io.NopCloser(r)

// 多 writer 同时写
mw := io.MultiWriter(os.Stdout, file)
io.Copy(mw, r)

// 管道（goroutine 间流式传递）
pr, pw := io.Pipe()
```

---

## 15. `os` 操作系统接口

```go
import "os"

// 参数与环境
os.Args                  // 命令行参数
home := os.Getenv("HOME")
os.Setenv("K", "v")      // 仅当前进程
val, ok := os.LookupEnv("K")

// 进程控制
os.Exit(1)               // 立即退出
os.Stdout.Write([]byte("hi"))

// 文件操作
f, _ := os.Open("a.txt")                // 只读
f, _ = os.Create("b.txt")               // 创建/清空
f, _ = os.OpenFile("c.txt", os.O_APPEND|os.O_WRONLY, 0644) // 追加
defer f.Close()
info, _ := f.Stat()                     // FileInfo：Name/Size/IsDir/ModTime
data := make([]byte, 100)
n, _ := f.Read(data)
f.WriteString("hello")

// 目录
os.Mkdir("dir", 0755)
os.MkdirAll("a/b/c", 0755)              // 递归
entries, _ := os.ReadDir("dir")         // []DirEntry（Go 1.16+，比 Readdir 轻量）
os.Remove("b.txt")                      // 删文件
os.RemoveAll("dir")                     // 递归删

// 临时
tmp, _ := os.CreateTemp("", "prefix-*.txt")
defer os.Remove(tmp.Name())
```

> **坑**：文件操作后务必 `defer f.Close()`；权限位 `0644` 是八进制；`OpenFile` 的 flag 组合常量（`os.O_CREATE` 等）需按需求拼接。

---

## 16. `path` 与 `path/filepath`

```go
import (
    "path"
    "path/filepath"
)

// path：斜杠分隔（URL、虚拟路径），跨平台不变
path.Join("a", "b", "c")     // a/b/c
path.Base("/a/b/c.txt")      // c.txt
path.Dir("/a/b/c.txt")       // /a/b
path.Ext("c.txt")            // .txt
path.Clean("a/../b")         // b

// filepath：按当前平台分隔符（Windows 用 \）
filepath.Join("a", "b")      // a/b (POSIX) 或 a\b (Win)
filepath.Abs("rel")          // 绝对路径
filepath.WalkDir("dir", func(path string, d os.DirEntry, err error) error {
    return nil
})
```

> **铁律**：处理**文件系统路径**用 `path/filepath`（适配平台分隔符）；处理 URL/虚拟路径用 `path`。

---

## 17. `flag` 命令行参数

```go
import (
    "flag"
    "fmt"
)

port := flag.Int("port", 8080, "server port")      // -port=8080
name := flag.String("name", "anon", "user name")
verbose := flag.Bool("v", false, "verbose")
flag.Parse() // 解析 os.Args
fmt.Println(*port, *name, *verbose)
fmt.Println(flag.Args()) // 非 flag 的位置参数
```

---

## 18. `bytes` 字节操作

```go
import "bytes"

// 可变字节缓冲（类似 strings.Builder 但操作 []byte）
var buf bytes.Buffer
buf.WriteString("hello")
buf.WriteByte('!')
data := buf.Bytes()

// 字节切片工具
bytes.Contains([]byte("abc"), []byte("b")) // true
bytes.Split([]byte("a,b"), []byte(","))    // [][]byte
bytes.Join([][]byte{[]byte("a"), []byte("b")}, []byte("-"))
bytes.Equal([]byte("a"), []byte("a"))      // 安全比较（避免 []byte== 的陷阱）
bytes.TrimSpace([]byte("  x  "))
bytes.ReplaceAll([]byte("a.b"), []byte("."), []byte("-"))
```

> **坑**：比较 `[]byte` 用 `bytes.Equal`，不要用 `==`（`==` 对切片比较的是引用而非内容）。

---

## 19. `context` 上下文

`context` 是 Go 并发取消/超时/传值的**标准机制**，几乎所有 I/O、RPC、DB 调用都接收它。

```go
import (
    "context"
    "fmt"
    "time"
)

// 超时控制
ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
defer cancel() // 必须调用，释放资源

// 手动取消
ctx2, cancel2 := context.WithCancel(context.Background())
go func() {
    cancel2() // 某条件触发取消
}()

// 截止时间
ctx3, _ := context.WithDeadline(context.Background(), time.Now().Add(time.Minute))

// 传值（仅传请求域元数据，不传可选参数）
ctx4 := context.WithValue(ctx, "traceID", "abc123")
v := ctx4.Value("traceID")

// 监听取消
select {
case <-ctx.Done():
    fmt.Println(ctx.Err()) // context deadline exceeded
case result := <-ch:
    _ = result
}
```

> **铁律**：函数签名第一个参数通常是 `ctx context.Context`；`cancel` 一定要 `defer`；不要把 `context` 存进结构体（作为显式参数传递）；`WithValue` 只放请求元数据。

---

## 20. `sync` 同步原语

```go
import (
    "sync"
    "sync/atomic"
)

// Mutex 互斥锁
var mu sync.Mutex
mu.Lock()
// 临界区
mu.Unlock()

// RWMutex：读多写少
var rw sync.RWMutex
rw.RLock() /* 读 */ rw.RUnlock()
rw.Lock()  /* 写 */ rw.Unlock()

// WaitGroup：等待一组 goroutine 完成
var wg sync.WaitGroup
for i := 0; i < 5; i++ {
    wg.Add(1)
    go func() {
        defer wg.Done()
        // 工作
    }()
}
wg.Wait() // 阻塞直到全部 Done

// Once：只执行一次（单例初始化）
var once sync.Once
once.Do(initConfig)

// Map：并发安全 map（读多写少场景优于加锁 map）
var m sync.Map
m.Store("k", 1)
v, ok := m.Load("k")
m.LoadOrStore("k", 2)
m.Delete("k")

// Pool：对象复用，减轻 GC 压力
var pool sync.Pool
pool.Put(&bytes.Buffer{})
b := pool.Get().(*bytes.Buffer)

// Cond：条件变量
cond := sync.NewCond(&mu)
cond.Wait()
cond.Signal()
cond.Broadcast()
```

---

## 21. `sync/atomic` 原子操作

```go
import "sync/atomic"

// Go 1.19+ 类型安全原子变量（推荐）
var counter atomic.Int64
counter.Add(1)
counter.Load()
counter.Store(10)
counter.CompareAndSwap(10, 20)

var ready atomic.Bool
ready.Store(true)
if ready.Load() { /* ... */ }

var ptr atomic.Pointer[Config]
ptr.Store(&cfg)

// 旧式函数式（仍可用）
var n int64
atomic.AddInt64(&n, 1)
atomic.LoadInt64(&n)
atomic.StoreInt64(&n, 5)
```

> **坑**：优先用 `atomic.Int64` 等类型安全版本（Go 1.19+），避免 `&n` 对齐问题；不要对 `atomic` 变量取地址做非原子访问。

---

## 22. `net/http` HTTP 服务与客户端

`net/http` 是 Go 的**内置 HTTP 能力**，无需框架即可生产使用。

```go
package main

import (
    "encoding/json"
    "net/http"
    "time"
)

// 处理器
func hello(w http.ResponseWriter, r *http.Request) {
    // 请求信息
    _ = r.Method
    _ = r.URL.Path
    _ = r.Header.Get("Authorization")
    _ = r.FormValue("q") // 解析表单

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{"msg": "hi"})
}

// 中间件（包装 Handler）
func logging(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        next.ServeHTTP(w, r)
        println("took", time.Since(start).String())
    })
}

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("/hello", hello)

    srv := &http.Server{
        Addr:    ":8080",
        Handler: logging(mux),
        // Go 1.27 推荐显式超时，防 Slowloris
        ReadTimeout:  5 * time.Second,
        WriteTimeout: 10 * time.Second,
        IdleTimeout:  120 * time.Second,
    }
    srv.ListenAndServe()
}
```

### 客户端

```go
import "net/http"

// 简单 GET
resp, err := http.Get("https://example.com")
if err != nil { /* ... */ }
defer resp.Body.Close()
body, _ := io.ReadAll(resp.Body)
_ = resp.StatusCode

// 自定义请求（POST JSON）
req, _ := http.NewRequest(http.MethodPost, "https://api.x/v1", bytes.NewReader(payload))
req.Header.Set("Content-Type", "application/json")
client := &http.Client{ Timeout: 10 * time.Second }
resp, err = client.Do(req)

// 带 context 的超时请求
ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
defer cancel()
req = req.WithContext(ctx)
```

关键接口：`ListenAndServe` / `NewServeMux` / `HandleFunc` / `Handler` / `ResponseWriter`（`Header`/`Write`/`WriteHeader`）/ `Request`（`Method`/`URL`/`Header`/`Body`/`Context`）/ `Client`/`Get`/`Post`/`Do` / `http.Error` / `http.Redirect` / `http.SetCookie`。

> **铁律**：服务端**务必设置超时**（`ReadTimeout`/`WriteTimeout`），否则一个慢客户端可耗尽连接；客户端务必 `defer resp.Body.Close()`；`http.Get` 默认无超时，生产用带 `Timeout` 的 `Client`。

---

## 23. `net/url` 与 `net`

```go
import (
    "net"
    "net/url"
    "fmt"
)

// URL 解析
u, _ := url.Parse("https://user:pw@example.com:8080/p?x=1&y=2#h")
fmt.Println(u.Scheme, u.Host, u.Path, u.Fragment)
v := u.Query()             // url.Values
v.Add("z", "3")
u.RawQuery = v.Encode()

// 构造
q := url.Values{}
q.Set("a", "1")
urlStr := "https://api.x/?" + q.Encode()

// TCP 连接
conn, _ := net.Dial("tcp", "example.com:80")
conn.Write([]byte("GET / HTTP/1.0\r\n\r\n"))
// 监听
ln, _ := net.Listen("tcp", ":9000")
for {
    c, err := ln.Accept()
    if err != nil { break }
    go func(c net.Conn) { defer c.Close() }(c)
}
```

---

## 24. `hash` 与 `crypto` 哈希/加解密

```go
import (
    "crypto/rand"
    "crypto/sha256"
    "crypto/md5"
    "crypto/hmac"
    "crypto/sha512"
    "encoding/hex"
    "fmt"
)

// 哈希
h := sha256.Sum256([]byte("data"))
fmt.Println(hex.EncodeToString(h[:]))

m := md5.Sum([]byte("x"))       // 注意 MD5 不安全，仅校验非安全用途
s512 := sha512.Sum512([]byte("x"))

// HMAC（带密钥摘要）
mac := hmac.New(sha256.New, []byte("secret"))
mac.Write([]byte("msg"))
fmt.Println(hex.EncodeToString(mac.Sum(nil)))

// 密码学安全随机（生成令牌/盐）
salt := make([]byte, 16)
rand.Read(salt) // 不要用 math/rand！
token := make([]byte, 32)
rand.Read(token)
```

> **铁律**：令牌/盐/密钥用 `crypto/rand`（密码学安全），绝不用 `math/rand`；MD5/SHA1 不适合安全哈希，用 SHA256/SHA512；HMAC 用于消息认证。

---

## 25. `compress`（gzip / zlib）

```go
import (
    "bytes"
    "compress/gzip"
    "io"
)

// gzip 压缩
var buf bytes.Buffer
gw := gzip.NewWriter(&buf)
gw.Write([]byte("hello world"))
gw.Close() // 必须 Close 写尾部
compressed := buf.Bytes()

// 解压
gr, _ := gzip.NewReader(bytes.NewReader(compressed))
out, _ := io.ReadAll(gr)
gr.Close()
```

---

## 26. `os/exec` 执行命令

```go
import (
    "os/exec"
    "context"
)

// 简单执行（输出全部）
out, err := exec.Command("ls", "-la").Output()
if err != nil { /* ... */ }

// 带 context 超时、分离 stdin/stdout
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()
cmd := exec.CommandContext(ctx, "ffmpeg", "-i", "in.mp4", "out.mp4")
cmd.Stdout = os.Stdout
cmd.Stderr = os.Stderr
cmd.Run()

// 只取 stdout
b, _ := exec.Command("git", "rev-parse", "HEAD").Output()
```

> **坑**：`exec.Command` 第一个参数是程序名，其余是**独立参数**（不要拼成一条 shell 字符串，避免注入）；用 `CommandContext` 便于超时取消。

---

## 27. `os/signal` 信号与优雅退出

```go
import (
    "os"
    "os/signal"
    "syscall"
    "context"
)

// 监听退出信号，优雅关闭
ctx, stop := signal.NotifyContext(context.Background(),
    syscall.SIGINT, syscall.SIGTERM)
defer stop()

<-ctx.Done() // 收到 Ctrl+C / kill 时返回
fmt.Println("shutting down...")
// 此处清理资源、关闭 server.GracefulShutdown(ctx)
```

---

## 28. `reflect` 反射

反射用于在运行时探查/修改类型，常见用途：序列化、ORM、依赖注入。

```go
import (
    "reflect"
    "fmt"
)

type User struct {
    Name string `json:"name"`
    Age  int    `json:"age"`
}

u := User{"Alice", 30}
t := reflect.TypeOf(u)   // reflect.Type
v := reflect.ValueOf(&u) // reflect.Value（指针可修改）

fmt.Println(t.Name(), t.Kind()) // User struct
// 遍历字段 + 读取 tag
for i := 0; i < t.NumField(); i++ {
    f := t.Field(i)
    fmt.Println(f.Name, f.Tag.Get("json"))
}

// 修改（必须传指针）
ev := v.Elem()
ev.FieldByName("Age").SetInt(31)
```

> **坑**：反射有性能开销且丧失编译期类型安全，`encoding/json`、测试场景外应尽量避免；修改值必须传指针并 `Elem()`。

---

## 29. `testing` 测试

```go
package main

import (
    "testing"
)

func Add(a, b int) int { return a + b }

func TestAdd(t *testing.T) {
    if got := Add(1, 2); got != 3 {
        t.Errorf("Add(1,2)=%d, want 3", got)
    }
}

func TestAddTable(t *testing.T) {
    cases := []struct {
        a, b, want int
    }{{1, 2, 3}, {0, 0, 0}, {-1, 1, 0}}
    for _, c := range cases {
        t.Run("case", func(t *testing.T) {
            if Add(c.a, c.b) != c.want {
                t.Fail()
            }
        })
    }
}

// 基准测试
func BenchmarkAdd(b *testing.B) {
    for i := 0; i < b.N; i++ {
        Add(1, 2)
    }
}
```

运行：`go test ./...`、`go test -run TestAdd -v`、`go test -bench=.`。

---

## 30. `runtime` 运行时

```go
import "runtime"

n := runtime.NumCPU()          // CPU 核心数
runtime.GOMAXPROCS(n)          // 设置并行 P 数
g := runtime.NumGoroutine()    // 当前 goroutine 数
runtime.GC()                   // 手动触发 GC
var mem runtime.MemStats
runtime.ReadMemStats(&mem)      // 内存统计
runtime.Goexit()               // 终止当前 goroutine
```

---

## 31. `embed` 嵌入静态资源

Go 1.16+ 原生支持将静态文件编译进二进制。

```go
import (
    _ "embed"
    "net/http"
)

//go:embed config.json
var configJSON []byte

//go:embed templates/*.html
var tplFS embed.FS

func main() {
    // 直接作为 HTTP 文件服务
    http.Handle("/static/", http.FileServer(http.FS(tplFS)))
    // 读取嵌入文件
    data, _ := tplFS.ReadFile("templates/index.html")
    _ = data
    _ = configJSON
}
```

> **注意**：`//go:embed` 指令必须紧贴变量声明上方，且路径相对于当前源文件。

---

## 32. `container`（list / heap / ring）

```go
import (
    "container/list"
    "container/ring"
)

// 双向链表
l := list.New()
l.PushBack(1)
l.PushFront(0)
for e := l.Front(); e != nil; e = e.Next() {
    _ = e.Value
}

// 环形缓冲
r := ring.New(3)
for i := 0; i < 3; i++ {
    r.Value = i
    r = r.Next()
}
r.Do(func(v any) { _ = v })
```

> `container/heap` 提供最小堆接口（`heap.Init`/`heap.Push`/`heap.Pop`），用于优先级队列。

---

## 33. `text/template` / `html/template`

```go
import (
    "os"
    "text/template"
    "html/template"
)

// 文本模板
tmpl := template.Must(template.New("t").Parse("Hello {{.Name}}, age {{.Age}}"))
tmpl.Execute(os.Stdout, struct{ Name string; Age int }{"Alice", 30})

// HTML 模板（自动转义，防 XSS）
htmpl := template.Must(html.New("h").Parse("<p>{{.}}</p>"))
htmpl.Execute(os.Stdout, "<script>alert(1)</script>") // 自动转义
```

> **铁律**：输出到网页**必须**用 `html/template`（自动转义防 XSS），不要用 `text/template` 渲染 HTML。

---

## 34. `iter` 迭代器（Go 1.23+）

Go 1.23 引入 `iter.Seq`/`iter.Seq2`，支持 `range over func` 与标准库迭代器。

```go
import "iter"

// 自定义序列
func countTo(n int) iter.Seq[int] {
    return func(yield func(int) bool) {
        for i := 1; i <= n; i++ {
            if !yield(i) { return } // 调用方停止时提前退出
        }
    }
}

for v := range countTo(3) {
    println(v) // 1 2 3
}

// 标准库已支持迭代器：maps.Keys / slices.Values 等
m := map[string]int{"a": 1}
for k := range maps.Keys(m) { _ = k }
```

---

## 35. `unicode` / `unicode/utf8`

```go
import (
    "unicode"
    "unicode/utf8"
)

unicode.IsLetter('中')      // true
unicode.IsDigit('9')        // true
unicode.ToUpper('a')        // 'A'

// UTF-8 字节处理（避免按 byte 切中文）
s := "你好"
n := utf8.RuneCountInString(s) // 字符数 = 2（非字节数 6）
for _, r := range s {          // range 自动按 rune
    _ = r
}
```

> **坑**：Go 字符串是 UTF-8 字节序列，`len(s)` 返回**字节数**；统计字符用 `utf8.RuneCountInString` 或 `for range`。

---

## 36. 常见坑与最佳实践

1. **`json` 字段必须导出**：首字母小写的字段不会被序列化/反序列化。
2. **`errors.Is` 需 `%w` 包装**：`%v` 包装的链路 `errors.Is` 无法匹配。
3. **文件/响应体务必 `Close`**：`os.Open`/`resp.Body` 后要 `defer Close()`，否则句柄泄漏。
4. **HTTP 服务端设超时**：`ReadTimeout`/`WriteTimeout` 防 Slowloris 耗尽连接。
5. **HTTP 客户端用 `Client` 超时**：`http.Get` 无超时，生产用 `&http.Client{Timeout:...}`。
6. **`context` 第一个参数、`cancel` 要 `defer`**：取消函数不调用会泄漏资源/goroutine。
7. **随机数安全**：令牌/盐/密钥用 `crypto/rand`，绝不用 `math/rand`。
8. **`bytes.Equal` 比较切片**：`[]byte ==` 比较的是引用而非内容。
9. **`path` vs `filepath`**：文件系统用 `filepath`，URL/虚拟路径用 `path`。
10. **时间格式用参考时间**：`2006-01-02 15:04:05`，不要用 `%Y%m%d`。
11. **循环拼接用 `strings.Builder`/`bytes.Buffer`**：避免 `+=` 反复分配。
12. **正则预编译**：固定正则用包级 `regexp.MustCompile`，别在循环里编译。
13. **HTML 用 `html/template`**：自动转义防 XSS。
14. **原子变量用类型安全版**（Go 1.19+ `atomic.Int64`），避免地址对齐陷阱。
15. **`reflect` 慎用**：有开销且丧失类型安全，仅序列化/框架级场景使用。

---

## 37. 参考文档

- [Go 官方标准库文档（总览）](https://pkg.go.dev/std)
- [Go 标准库 `fmt`](https://pkg.go.dev/fmt)
- [Go 标准库 `strings`](https://pkg.go.dev/strings)
- [Go 标准库 `strconv`](https://pkg.go.dev/strconv)
- [Go 标准库 `time`](https://pkg.go.dev/time)
- [Go 标准库 `math`](https://pkg.go.dev/math)
- [Go 标准库 `math/rand/v2`](https://pkg.go.dev/math/rand/v2)
- [Go 标准库 `math/big`](https://pkg.go.dev/math/big)
- [Go 标准库 `sort`](https://pkg.go.dev/sort)
- [Go 标准库 `slices`](https://pkg.go.dev/slices)
- [Go 标准库 `maps`](https://pkg.go.dev/maps)
- [Go 标准库 `cmp`](https://pkg.go.dev/cmp)
- [Go 标准库 `errors`](https://pkg.go.dev/errors)
- [Go 标准库 `log`](https://pkg.go.dev/log)
- [Go 标准库 `log/slog`](https://pkg.go.dev/log/slog)
- [Go 标准库 `encoding/json`](https://pkg.go.dev/encoding/json)
- [Go 标准库 `encoding/json/v2`（Go 1.27 新增）](https://pkg.go.dev/encoding/json/v2)
- [Go 标准库 `encoding/xml`](https://pkg.go.dev/encoding/xml)
- [Go 标准库 `encoding/csv`](https://pkg.go.dev/encoding/csv)
- [Go 标准库 `encoding/base64`](https://pkg.go.dev/encoding/base64)
- [Go 标准库 `regexp`](https://pkg.go.dev/regexp)
- [Go 标准库 `bufio`](https://pkg.go.dev/bufio)
- [Go 标准库 `io`](https://pkg.go.dev/io)
- [Go 标准库 `os`](https://pkg.go.dev/os)
- [Go 标准库 `path`](https://pkg.go.dev/path)
- [Go 标准库 `path/filepath`](https://pkg.go.dev/path/filepath)
- [Go 标准库 `flag`](https://pkg.go.dev/flag)
- [Go 标准库 `bytes`](https://pkg.go.dev/bytes)
- [Go 标准库 `context`](https://pkg.go.dev/context)
- [Go 标准库 `sync`](https://pkg.go.dev/sync)
- [Go 标准库 `sync/atomic`](https://pkg.go.dev/sync/atomic)
- [Go 标准库 `net/http`](https://pkg.go.dev/net/http)
- [Go 标准库 `net/url`](https://pkg.go.dev/net/url)
- [Go 标准库 `net`](https://pkg.go.dev/net)
- [Go 标准库 `crypto/sha256`](https://pkg.go.dev/crypto/sha256)
- [Go 标准库 `crypto/hmac`](https://pkg.go.dev/crypto/hmac)
- [Go 标准库 `crypto/rand`](https://pkg.go.dev/crypto/rand)
- [Go 标准库 `compress/gzip`](https://pkg.go.dev/compress/gzip)
- [Go 标准库 `os/exec`](https://pkg.go.dev/os/exec)
- [Go 标准库 `os/signal`](https://pkg.go.dev/os/signal)
- [Go 标准库 `reflect`](https://pkg.go.dev/reflect)
- [Go 标准库 `testing`](https://pkg.go.dev/testing)
- [Go 标准库 `runtime`](https://pkg.go.dev/runtime)
- [Go 标准库 `embed`](https://pkg.go.dev/embed)
- [Go 标准库 `container/list`](https://pkg.go.dev/container/list)
- [Go 标准库 `container/heap`](https://pkg.go.dev/container/heap)
- [Go 标准库 `text/template`](https://pkg.go.dev/text/template)
- [Go 标准库 `html/template`](https://pkg.go.dev/html/template)
- [Go 标准库 `iter`](https://pkg.go.dev/iter)
- [Go 标准库 `unicode/utf8`](https://pkg.go.dev/unicode/utf8)
- [Go 1.27 发布说明](https://go.dev/doc/go1.27)
- [Go 官方语言之旅（Tour）](https://go.dev/tour/welcome/1)

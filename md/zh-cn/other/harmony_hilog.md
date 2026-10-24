---
title: 鸿蒙hilog常用命令
create:2026-10-19
update:2026-10-19
category:other
cover:https://img-common.aknot.uk/cover/land-34.jpg
tags:[harmony,log,hilog,tip,hdc]
summary:hilog的常用场景命令集合
keywords:[harmonyos,hilog,logging,log,debug,command]
top:1
copyright:true
---

## 常用hilog命令

### 查看日志

| 命令                    | 作用                                                   |
| ----------------------- | ------------------------------------------------------ |
| `hilog`                 | 实时滚动输出全部日志                                   |
| `hilog -L D/I/W/E/F`    | 按级别过滤（DEBUG/INFO/WARN/ERROR/FATAL）              |
| `hilog -t app`          | 只看应用日志（core/init/kmsg 等其他类型同理）          |
| `hilog -T TAG名`        | 按 Tag 过滤，如 `hilog -T SAMGR`                       |
| `hilog -D 0xD001719`    | 按 Domain ID 过滤（core 类型前缀加 `d`，如 `d001719`） |
| `hilog -P <pid>`        | 按进程 PID 过滤                                        |
| `hilog -e "正则表达式"` | 按日志内容正则匹配，如 `hilog -e "start.*Ability"`     |
| `hilog -a 20`           | 显示缓冲区前 20 行                                     |
| `hilog -z 20`           | 显示缓冲区后 20 行（tail -n 效果）                     |

```
//进入交互式
hdc -t 192.168.18.197:44507 shell
//查看20条
hilog -a 20
```

### 设置日志级别

```
hilog -b D                  # 全局最低级别设为 Debug（临时，重启失效）
hilog -b E --persist        # 全局设为 Error，重启仍生效
hilog -b D -D 0x2d00        # 仅打开某 Domain（app 类型）的 Debug
hilog -b D -D d001719       # 仅打开某 Domain（core 类型）的 Debug
hilog -b W -T testTag       # 仅设置某 Tag 的最低级别
```

### 缓冲区管理

| 命令                 | 作用                                         |
| -------------------- | -------------------------------------------- |
| `hilog -g`           | 查看各类型 buffer 大小（默认 16M / 类）      |
| `hilog -G 16M`       | 设置 buffer 大小（范围 64K–16M，单位 B/K/M） |
| `hilog -G 4M -t app` | 只调整 app 类型的 buffer                     |
| `hilog -r`           | 清空缓冲区日志                               |

### 落盘日志

```
//默认路径:/data/log/hilog/hilog
hilog -w query              # 查询当前落盘任务
hilog -w start -n 1000      # 开启落盘，最多 1000 个文件（每个 4M）
hilog -w stop               # 停止落盘任务
```

### 其他

```
命令	作用
hilog -k on/off	开关内核日志（kmsg）读取
param get hilog.loggable.global	查询当前全局日志级别
hilog -h	帮助
```



## 常用场景

```
# 只看自己 App 的 Error 日志并实时跟踪
hdc shell hilog -L E -T "MyTag"
# 高负载下抓某个领域的 Debug 日志（先关全局，再单独开）
hdc shell hilog -b X              # 全局静默
hdc shell hilog -b D -D 0x2d00    # 只打开目标 domain
# 抓取最近 500 行 Error 日志保存到本地
hdc shell hilog -L E -z 500 > crash.log
```



### 设备卡住或识别异常

```
hdc kill && hdc start -r
hdc list targets
```



### 获取日志详情

```
//获取设备列表
hdc list targets
//显示已连接设备
192.168.18.197:44507
```

```
//进入设备交互式shell
hdc -t 192.168.18.197:44507 shell
//
cd data/log/hilog
//清除之前日志
hilog -w clear
exit
//复现问题操作
//导出保存日志
hdc file recv /data/log/hilog ./tmp/hilog
//查看根目录下tmp/hilog文件夹即为日志信息
```


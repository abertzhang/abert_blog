---
title: 鸿蒙idc常用命令
create:2026-10-19
update:2026-10-19
category:other
cover:https://img-common.aknot.uk/cover/land-13.jpg
tags:[harmony,log,hilog,tip,hdc]
summary:hilog的常用场景命令集合
keywords:[harmonyos,hdc,command-line,device,debug,tool]
top:1
copyright:true
---

## 常用命令

### 设备连接管理

| 命令                          | 作用                           |
| ----------------------------- | ------------------------------ |
| `hdc list targets [-v]`       | 列出已连接设备（多设备时用）   |
| `hdc wait`                    | 等待设备上线后再执行后续命令   |
| `hdc tconn <IP:port>`         | 通过网络（无线）连接设备       |
| `hdc tconn <IP:port> -remove` | 断开网络设备连接               |
| `hdc -s <设备SN> <命令>`      | 多设备时指定某一台执行命令     |
| `hdc reconnect <SN>`          | USB 异常时重连（触发重新枚举） |
| `hdc kill` / `hdc start -r`   | 重启 hdc server（卡顿时用）    |

### shell交互

| 命令                                            | 作用                                            |
| ----------------------------------------------- | ----------------------------------------------- |
| `hdc shell`                                     | 进入设备交互式 shell                            |
| `hdc shell <cmd>`                               | 单次执行命令，如 `hdc shell ls /data/local/tmp` |
| `hdc shell -b <包名>`                           | 进入指定可调试应用的沙箱目录                    |
| `hdc shell -b <包名> ls data/storage/el2/base/` | 在应用沙箱内执行命令                            |
| `hdc shell ps -ef | grep <关键字>`              | 查看进程                                        |
| `hdc shell kill -9 <pid>`                       | 强杀进程                                        |

### 安装卸载

```
hdc install xxx.hap                # 安装 HAP
hdc install -r xxx.hap             # 覆盖安装（保留数据）
hdc install -g xxx.hap             # debug 包自动授予权限
hdc install -p D:\hap_dir          # 安装目录下多个 HAP（多 HAP 应用）
hdc install -s xxx.hsp              # 安装共享包 HSP（必加 -s）

hdc uninstall com.example.app      # 卸载应用
hdc uninstall -k com.example.app   # 卸载但保留数据
hdc uninstall -s com.example.app   # 卸载 HSP 共享包
```

### 文件传输

```
hdc file send 本地路径 设备路径      # 推文件到设备
hdc file send D:\test.png /data/local/tmp/
hdc file recv 设备路径 本地路径      # 从设备拉文件
hdc file recv /data/log/hilog/hilog.log ./crash.log
```

### 日志调试

```
hdc shell hilog                    # 实时日志（同 adb logcat）
hdc shell hilog -L E               # 只看 Error
hdc shell hilog -T "MyTag"         # 按 Tag 过滤
hdc shell hilog | grep "keyword"   # 管道过滤
hdc bugreport                      # 导出完整系统信息（类似 adb bugreport）
hdc jpid                           # 查看已打开应用的 PID
hdc track-jpid -a                  # 实时显示 PID + 包名（含 release 标签）
```

### 端口转发

```
hdc fport ls                       # 列出所有转发任务
hdc fport tcp:8080 tcp:8080       # 正向：电脑 8080 → 设备 8080
hdc rport tcp:9000 tcp:9000       # 反向：设备 9000 → 电脑 9000
hdc fport rm tcp:8080             # 删除指定转发
```

### 设备控制

```
hdc shell reboot                   # 重启设备
hdc shell reboot bootloader        # 重启到 bootloader/fastboot
hdc shell reboot recovery          # 重启到 recovery
hdc shell param get <key>          # 查询系统参数
hdc shell param set <key> <value>  # 设置系统参数
```

## 实战场景

### 无线调试

```
# 先用 USB 连上，打开网络通道
hdc shell tmode port
# 然后用 IP 连接
hdc tconn 192.168.1.100:8710
```

```
//另一个实现无线调试方案
//保持调试手机和开发电脑同一个网段
//在开发者选型下有无线调试地址:如192.168.1.100:8710
//在Deveco的设备下拉框菜单选择"IP Connect",输入上述ip地址
```

### 抓崩溃日志

```
hdc shell hilog -L E -z 500 > crash.log
hdc bugreport > bugreport.txt
```

### 打包脚本

```
hdc install -r build/outputs/default/entry-default-signed.hap
hdc shell aa start -a EntryAbility -b com.example.myapp
```


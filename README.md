# LLMFit 本地硬件适配看板

一个运行在本机浏览器中的中文看板，用于查看电脑的 CPU、内存、GPU/显存配置，并根据实际硬件展示适合运行的本地大模型。

![Python](https://img.shields.io/badge/Python-3.12%2B-3776AB?logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=0b1020)
![Windows](https://img.shields.io/badge/Windows-%E4%BC%98%E5%85%88-0078D4?logo=windows&logoColor=white)

## 依赖与致谢

本项目使用 [AlexsJones/llmfit](https://github.com/AlexsJones/llmfit) 作为本机硬件检测、模型数据库和模型适配评分引擎。

看板本身不重新计算显存需求、量化方案或 tok/s 估算；它会在本机启动官方 `llmfit serve`，并通过其 REST API 读取硬件和推荐模型数据。感谢 `llmfit` 项目提供的开源能力。

## 功能

- 自动识别 CPU 型号、逻辑核心数和推理后端
- 显示系统内存总量、可用量和使用比例
- 显示主 GPU、VRAM、多 GPU 明细和后端信息
- 按适配度、用途、运行时和排序方式筛选模型
- 搜索模型名称或提供商
- 展示模型评分、预计 tok/s、最佳量化、运行模式、内存需求与可用上下文
- 点击模型查看评分构成、能力、许可证、显存利用率和官方备注
- 仅绑定 `127.0.0.1`，不会把硬件信息暴露到局域网

## 运行要求

- Windows 10 / 11（当前版本优先支持）
- Python 3.12+
- [uv](https://docs.astral.sh/uv/)
- Node.js 18+
- 官方 `llmfit` 1.1.10 或更高版本

安装或更新官方 `llmfit`：

```powershell
uv tool install -U llmfit
```

## 快速开始

首次使用需要安装并构建前端：

```powershell
npm --prefix frontend ci
npm --prefix frontend run build
```

之后直接双击根目录的 [start-dashboard.cmd](./start-dashboard.cmd)。脚本会：

1. 检查官方 `llmfit` 是否可用。
2. 使用项目本地的 uv 缓存启动 Python 服务。
3. 启动内部 `llmfit serve` 进程。
4. 自动打开浏览器。

默认访问地址为：

```text
http://127.0.0.1:8765
```

关闭脚本弹出的命令窗口即可停止看板和内部 `llmfit` 服务。

## 手动启动

如果不想自动打开浏览器：

```powershell
uv run llmfit-dashboard --no-open
```

修改前端界面时，可分别启动后端和 Vite 开发服务器：

```powershell
uv run llmfit-dashboard --no-open
npm --prefix frontend run dev
```

此时在浏览器访问 Vite 提供的地址（通常为 `http://127.0.0.1:5173`）；`/api` 请求会自动代理到本地 Python 服务。

## 项目结构

```text
src/llmfit_dashboard/  Python 启动器、子进程管理与 API 代理
frontend/              React + Vite 中文前端
tests/                 Python 单元测试
start-dashboard.cmd    Windows 双击启动入口
```

## 验证

```powershell
uv run pytest -q
npm --prefix frontend test
npm --prefix frontend run build
```

## 常见问题

### 双击脚本没有打开页面

请先确认已经完成前端构建：

```powershell
npm --prefix frontend ci
npm --prefix frontend run build
```

然后重新双击 `start-dashboard.cmd`。如果浏览器没有自动打开，请手动访问 `http://127.0.0.1:8765`，并保留命令窗口开启。

### 提示未找到或版本过旧的 llmfit

执行以下命令后重新启动：

```powershell
uv tool install -U llmfit
```

### 端口 8765 被占用

使用另一个端口启动：

```powershell
uv run llmfit-dashboard --port 8766
```

然后访问 `http://127.0.0.1:8766`。

## 数据说明

- 硬件与模型推荐结果均来自本机运行的 `llmfit`。
- 可用内存会随系统负载变化，每次刷新都可能不同。
- 预计 tok/s、显存需求和适配等级属于规划参考，实际表现还会受到推理框架、驱动、上下文长度和模型量化版本影响。
- 本项目不提供模型下载、模型运行、基准测试或远程访问功能。

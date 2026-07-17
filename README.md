# Simu20 组网运行仿真系统

Simu20 是一个面向网络拓扑设计与运行仿真的 Web 前端。系统通过 NEST Core Proxy API 管理仿真场景、CORE 节点、链路和计算服务器，并使用 Cesium 在三维地球上完成节点部署与拓扑展示。

项目采用 Vue 3、TypeScript、Vite、Pinia、Element Plus 和 Cesium 开发。

## 主要功能

- 场景管理：创建、查询、删除仿真场景，展示 `DEFINITION`、`RUNTIME`、`SHUTDOWN` 状态。
- 运行控制：启动和停止场景，并同步维护前端场景状态。
- 三维拓扑：在 Cesium 地球上展示节点、链路及节点名称。
- 节点管理：支持单个或批量部署、编辑和删除节点。
- 节点类型：支持 `DEFAULT`、`DOCKER`、`QEMU`、`SWITCH`、`HUB`、`WIRELESS_LAN`。
- 链路管理：支持单条或批量创建、编辑和删除有线/无线链路及网络参数。
- 服务器管理：注册 CORE 服务器、查询在线状态和移除服务器。
- AI 助手：通过 SSE 流式接口进行对话，并支持停止生成和清除历史。
- 大整数兼容：使用 `json-bigint` 将后端雪花 ID 保存为字符串，避免 JavaScript 精度丢失。

将要实现的：
> 终端 WebSocket 和 QEMU VNC WebSocket 接口已写入 [API.md](./API.md)，但对应的 API、Store 和界面组件目前仍是待实现状态。

## 技术栈

| 分类 | 技术 |
| --- | --- |
| 前端框架 | Vue 3、TypeScript |
| 构建工具 | Vite 8 |
| 状态管理 | Pinia |
| 路由 | Vue Router |
| UI 组件 | Element Plus、Lucide Vue Next |
| 三维地图 | Cesium、vite-plugin-cesium |
| 数据处理 | json-bigint |
| 代码检查 | vue-tsc、ESLint、oxlint、Prettier |

## 运行要求

- Node.js `^22.18.0` 或 `>=24.12.0`
- npm（项目已提交 `package-lock.json`）
- 可访问的 NEST Core Proxy 后端，默认端口为 `8091`
- 有效的 Cesium ion Access Token

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 Cesium Token

在项目根目录创建 `.env.local`：

```env
VITE_CESIUM_ION_TOKEN=your_cesium_ion_token
```

`.env.local` 只用于本地环境，不应提交真实 Token。

### 3. 配置后端地址

开发环境默认通过 Vite 将 `/api` 请求代理到后端。请根据实际部署地址修改 [vite.config.ts](./vite.config.ts) 中的 `target`：

```ts
proxy: {
  '/api': {
    target: 'http://<backend-host>:8091',
    changeOrigin: true,
  },
}
```

也可以在 `.env.local` 中直接指定 API 根地址：

```env
VITE_API_BASE_URL=http://<backend-host>:8091
```

使用 `VITE_API_BASE_URL` 时，请确保后端已经正确配置浏览器跨域访问；留空时则使用当前站点地址和 Vite `/api` 代理。

### 4. 启动开发服务器

```bash
npm run dev
```

默认访问地址：<http://localhost:5174>

局域网内其他设备也可以通过开发机 IP 和 `5174` 端口访问。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run build` | 执行类型检查并构建生产版本 |
| `npm run preview` | 本地预览生产构建 |
| `npm run type-check` | 执行 Vue/TypeScript 类型检查 |
| `npm run lint` | 执行 oxlint 和 ESLint，并自动修复可修复问题 |
| `npm run format` | 使用 Prettier 格式化 `src` 目录 |

## 项目结构

```text
simu20/
├─ public/models/                 # 可直接通过 URL 访问的三维模型
├─ src/
│  ├─ api/                       # 场景、节点、链路、服务器等接口封装
│  ├─ assets/                    # 全局样式和本地模型资源
│  ├─ composables/useEntities.ts # Cesium 节点和链路实体管理
│  ├─ router/                    # 页面路由
│  ├─ stores/                    # 拓扑、服务器和 AI 状态
│  └─ views/
│     ├─ sence/                  # 仿真场景列表页
│     └─ cesium/                 # 三维组网仿真页及业务组件
├─ API.md                        # NEST Core Proxy 接口文档
├─ vite.config.ts                # Vite、Cesium 和开发代理配置
└─ package.json                  # 依赖及项目脚本
```

## 页面与数据流程

1. 进入场景列表页，加载后端场景数据。
2. 创建或选择一个场景，进入 Cesium 组网页面。
3. 在地图上单个/批量放置节点，或选择两个节点建立链路。
4. 场景启动后，后端在 CORE 中创建运行资源并将状态切换为 `RUNTIME`。
5. 通过服务器管理和 AI 助手完成运行环境检查或辅助操作。

当前主要路由：

| 地址 | 页面 |
| --- | --- |
| `/` | 仿真场景管理 |
| `/cesium` | Cesium 三维组网仿真 |

## 后端接口

前端依赖统一响应格式：

```json
{
  "code": 200,
  "msg": "ok",
  "data": {}
}
```

主要接口前缀：

| 模块 | 前缀 |
| --- | --- |
| 场景 | `/api/sessions` |
| 节点 | `/api/sessions/{sessionId}/nodes` |
| 链路 | `/api/sessions/{sessionId}/links` |
| 服务器 | `/api/servers` |
| AI 对话 | `/api/ai` |

字段、请求体和响应示例请查看 [API.md](./API.md)。

## 构建与部署

```bash
npm run build
```

构建结果输出到 `dist/`。部署时需要注意：

- Web 服务器应将未知前端路由回退到 `index.html`，以支持 Vue Router history 模式。
- 将 `/api` 反向代理到 NEST Core Proxy，或在构建环境中配置 `VITE_API_BASE_URL`。
- `VITE_*` 环境变量会在构建时写入前端资源，不要在其中保存后端密钥。
- 如果页面使用 HTTPS，后续终端和 VNC 功能也必须使用 `wss://`，否则浏览器会拦截混合内容。

## 后续计划

- 接入节点终端地址和终端 WebSocket。
- 集成 xterm.js，实现可交互 Web 终端。
- 集成 noVNC，显示 QEMU 节点远程桌面。
- 完善断线重连、WebSocket 鉴权和窗口资源释放。
- 增加单元测试、接口测试和端到端测试。

## 开发说明

- 所有雪花 ID 在前端均按字符串处理，禁止转换为普通 `number`。
- 新增接口应统一通过 `src/api/request.ts` 处理响应和业务错误。
- 修改 API 契约时，请同步更新类型定义和 [API.md](./API.md)。
- 提交前建议运行：

```bash
npm run type-check
npm run build
```

# NEST Core Proxy — 接口文档

**Base URL**: `http://<host>:8091`

---

## 通用响应格式

所有接口均返回统一结构：

```json
{
  "code": 200,
  "msg": "ok",
  "data": { ... }
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| code | int | 200 = 成功，500 = 业务错误 |
| msg | string | 描述信息 |
| data | any | 业务数据，无数据时为 null |

---

## 一、场景管理 `/api/sessions`

### 1.1 获取场景列表

```
GET /api/sessions
```

**响应 `data`**：`Session[]`

```json
[
  {
    "id": 2072974655568429057,
    "name": "test-lab",
    "state": "DEFINITION",
    "userName": null,
    "createdAt": "2024-01-01T10:00:00",
    "updatedAt": "2024-01-01T10:00:00"
  }
]
```

| 字段 | 类型 | 说明 |
|---|---|---|
| id | long | 场景 ID（雪花 ID） |
| name | string | 场景名称 |
| state | string | `DEFINITION` / `RUNTIME` / `SHUTDOWN` |
| userName | string | 创建用户（预留，暂未使用） |
| createdAt | datetime | 创建时间 |
| updatedAt | datetime | 最后更新时间 |

---

### 1.2 获取单个场景

```
GET /api/sessions/{id}
```

**响应 `data`**：`Session`（结构同上）

---

### 1.3 创建场景

```
POST /api/sessions
Content-Type: application/json
```

**请求体**：

```json
{
  "name": "my-lab"
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| name | string | ✓ | 场景名称 |

**响应 `data`**：`Session`（state 为 `DEFINITION`）

---

### 1.4 启动场景

```
POST /api/sessions/{id}/start
```

将场景状态从 `DEFINITION` / `SHUTDOWN` 变为 `RUNTIME`。分布式场景下会在所有已注册服务器上并发创建并启动 CORE session（含空节点服务器，以支持热添加节点），最后同步网卡名称（ens7 等）到数据库。

**响应 `data`**：null

---

### 1.5 停止场景

```
POST /api/sessions/{id}/stop
```

将场景状态变为 `SHUTDOWN`，释放 CORE 运行资源。

**响应 `data`**：null

---

### 1.6 删除场景

```
DELETE /api/sessions/{id}
```

彻底删除场景及其所有节点、链路和接口记录，同时清理所有服务器上的 CORE session。不可恢复。

**响应 `data`**：null

---

### 1.7 同步场景状态

```
POST /api/sessions/{id}/sync
```

向所有服务器的 CORE daemon 查询状态，以最高优先级状态更新数据库。状态优先级：RUNTIME > SHUTDOWN > DEFINITION。

**响应 `data`**：`Session`

---

## 二、节点管理 `/api/sessions/{sessionId}/nodes`

### 2.1 获取节点列表

```
GET /api/sessions/{sessionId}/nodes
```

**响应 `data`**：`Node[]`

```json
[
  {
    "id": 2074418101562871809,
    "sessionId": 2072974655568429057,
    "serverId": 2074351630901534721,
    "nodeType": "QEMU",
    "name": "vm1",
    "model": null,
    "image": "ubuntu-vm",
    "alt": 0.0,
    "lon": 116.3,
    "lat": 39.9,
    "vcpus": 2,
    "memory": 2048,
    "coreNodeId": 1
  }
]
```

| 字段 | 类型 | 说明 |
|---|---|---|
| id | long | 节点 ID（雪花 ID） |
| sessionId | long | 所属场景 ID |
| serverId | long | 所在服务器 ID，启动前可能为 null（待调度） |
| nodeType | string | 节点类型，见下表 |
| name | string | 节点名称 |
| model | string | CORE 节点模型（可选） |
| image | string | Docker 镜像名或 QEMU 镜像路径 |
| alt / lon / lat | double | 节点地理坐标 |
| vcpus | int | CPU 核数（QEMU 节点） |
| memory | int | 内存 MB（QEMU 节点） |
| coreNodeId | int | CORE daemon 分配的节点 ID，`startSession` 后生效 |

**nodeType 可选值**：

| 值 | 说明 |
|---|---|
| `DOCKER` | 容器节点，需指定 `image` |
| `QEMU` | KVM 虚拟机，需指定 `vcpus`、`memory`、`image` |
| `SWITCH` | 以太网交换机 |
| `HUB` | 集线器 |
| `WIRELESS_LAN` | 无线局域网 |
| `DEFAULT` | CORE 默认节点类型 |

---

### 2.2 添加节点

```
POST /api/sessions/{sessionId}/nodes
Content-Type: application/json
```

DEFINITION/SHUTDOWN 状态仅写 DB；RUNTIME 状态自动热添加到 CORE（若该服务器上的 CORE session 已处于 RUNTIME，节点会立即启动）。

**请求体**：

```json
{
  "name": "vm1",
  "nodeType": "QEMU",
  "serverId": 2074351630901534721,
  "image": "ubuntu-vm",
  "model": null,
  "vcpus": 2,
  "memory": 2048,
  "alt": 0.0,
  "lon": 116.3,
  "lat": 39.9,
  "connectTo": [2074418101562871810]
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| name | string | ✓ | 节点名称 |
| nodeType | string | ✓ | 节点类型 |
| serverId | long | — | 指定服务器 ID；null = 自动调度（RUNTIME 时基于亲和性） |
| image | string | DOCKER/QEMU | 镜像名或路径 |
| model | string | — | CORE 节点模型 |
| vcpus | int | QEMU | CPU 核数 |
| memory | int | QEMU | 内存 MB |
| alt / lon / lat | double | — | 地理坐标 |
| connectTo | long[] | — | 计划连接的节点 ID 列表（RUNTIME 亲和性调度参考，可选） |

**响应 `data`**：`Node`

---

### 2.3 批量添加节点

```
POST /api/sessions/{sessionId}/nodes/batch
Content-Type: application/json
```

**请求体**：

```json
{
  "nodes": [
    { "name": "vm1", "nodeType": "QEMU", ... },
    { "name": "sw1", "nodeType": "SWITCH", ... }
  ]
}
```

**响应 `data`**：`BatchResult`

```json
{
  "succeeded": [ { ...Node }, { ...Node } ],
  "errors": []
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| succeeded | Node[] | 成功添加的节点列表 |
| errors | string[] | 失败原因列表（按顺序对应失败的条目） |

---

### 2.4 更新节点（部分字段）

```
PATCH /api/sessions/{sessionId}/nodes/{nodeId}
Content-Type: application/json
```

**请求体**（所有字段均可选，只传需要修改的）：

```json
{
  "name": "new-name",
  "serverId": 2074351630901534722,
  "lon": 120.0,
  "lat": 30.0,
  "alt": 100.0
}
```

**响应 `data`**：`Node`

---

### 2.5 删除节点

```
DELETE /api/sessions/{sessionId}/nodes/{nodeId}
```

同时删除该节点的所有关联链路和接口记录。RUNTIME 状态下会先从 CORE 移除节点再删 DB。

**响应 `data`**：null

---

### 2.6 执行节点命令

```
POST /api/sessions/{sessionId}/nodes/{nodeId}/cmd
Content-Type: application/json
```

向节点发送 Shell 命令（仅 RUNTIME 状态有效）。

**请求体**：

```json
{
  "command": "ip addr show",
  "wait": true
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| command | string | ✓ | 要执行的 Shell 命令 |
| wait | boolean | — | 是否等待命令返回，默认 true |

**响应 `data`**：string（命令输出，`wait=false` 时为空字符串）

---

### 2.7 获取终端地址

```
GET /api/sessions/{sessionId}/nodes/{nodeId}/terminal
```

**响应 `data`**：string（CORE 返回的终端连接地址）

---

### 2.8 获取终端 WebSocket 地址

```
GET /api/sessions/{sessionId}/nodes/{nodeId}/terminal-ws
```

**响应 `data`**：

```json
{
  "url": "ws://192.168.1.10:8080/terminal/...",
  "token": "..."
}
```

---

### 2.9 获取 VNC WebSocket 地址（QEMU 节点）

```
GET /api/sessions/{sessionId}/nodes/{nodeId}/vnc-ws
```

**响应 `data`**：

```json
{
  "url": "ws://192.168.1.10:5900",
  "port": 5900
}
```

---

## 三、链路管理 `/api/sessions/{sessionId}/links`

### 3.1 获取链路列表

```
GET /api/sessions/{sessionId}/links
```

**响应 `data`**：`LinkVO[]`

```json
[
  {
    "id": 2074418196018597890,
    "sessionId": 2072974655568429057,
    "linkType": "WIRED",
    "node1Id": 2074418101562871809,
    "node2Id": 2074412429907562497,
    "iface1Id": 2074418196018597891,
    "iface2Id": 2074418196018597892,
    "iface1": {
      "id": 2074418196018597891,
      "nodeId": 2074418101562871809,
      "ifaceId": 0,
      "name": "ens7",
      "mac": "02:5b:c9:4b:90:02",
      "ip4": "10.0.1.1",
      "ip4Mask": 24,
      "ip6": null,
      "ip6Mask": null,
      "mtu": 1500
    },
    "iface2": {
      "id": 2074418196018597892,
      "nodeId": 2074412429907562497,
      "ifaceId": 0,
      "name": "ens7",
      "mac": "02:5b:c9:4b:90:03",
      "ip4": "10.0.1.2",
      "ip4Mask": 24,
      "ip6": null,
      "ip6Mask": null,
      "mtu": 1500
    }
  }
]
```

**LinkVO 字段说明**：

| 字段 | 类型 | 说明 |
|---|---|---|
| id | long | 链路 ID（雪花 ID） |
| sessionId | long | 所属场景 ID |
| linkType | string | `WIRED` / `WIRELESS` |
| node1Id | long | 节点1 DB ID |
| node2Id | long | 节点2 DB ID |
| iface1Id | long | 节点1 接口的 DB ID |
| iface2Id | long | 节点2 接口的 DB ID |
| iface1 | Iface | 节点1 接口详情（含名称、IP、MAC 等） |
| iface2 | Iface | 节点2 接口详情 |

**Iface 字段说明**：

| 字段 | 类型 | 说明 |
|---|---|---|
| id | long | 接口 DB ID |
| nodeId | long | 所属节点 DB ID |
| ifaceId | int | CORE 分配的接口索引（startSession 后生效） |
| name | string | VM 内网卡名（如 `ens7`、`eth0`），startSession 后同步 |
| mac | string | MAC 地址 |
| ip4 / ip4Mask | string/int | IPv4 地址及掩码位数 |
| ip6 / ip6Mask | string/int | IPv6 地址及掩码位数 |
| mtu | int | MTU 大小 |

---

### 3.2 添加链路

```
POST /api/sessions/{sessionId}/links
Content-Type: application/json
```

DEFINITION/SHUTDOWN 状态仅写 DB；RUNTIME 状态自动热添加到 CORE，并从响应中回写网卡名（ens* 等）到数据库。跨服务器链路自动使用 GRE 隧道。

**请求体**：

```json
{
  "node1Id": 2074418101562871809,
  "node2Id": 2074412429907562497,
  "linkType": "WIRED",
  "ip4": "10.0.1.1",
  "ip4Mask": 24,
  "ip4B": "10.0.1.2",
  "ip4MaskB": 24,
  "ip6": null,
  "ip6Mask": null,
  "ip6B": null,
  "ip6MaskB": null,
  "bandwidth": null,
  "delay": null,
  "loss": null,
  "jitter": null,
  "dup": null,
  "unidirectional": null,
  "buffer": null
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| node1Id | long | ✓ | 节点1 DB ID |
| node2Id | long | ✓ | 节点2 DB ID |
| linkType | string | — | `WIRED`（默认）/ `WIRELESS` |
| ip4 / ip4Mask | string/int | — | 节点1 接口 IPv4 地址及掩码位数 |
| ip4B / ip4MaskB | string/int | — | 节点2 接口 IPv4 地址及掩码位数 |
| ip6 / ip6Mask | string/int | — | 节点1 接口 IPv6 地址及掩码位数 |
| ip6B / ip6MaskB | string/int | — | 节点2 接口 IPv6 地址及掩码位数 |
| bandwidth | long | — | 带宽上限（bps） |
| delay | int | — | 单向延迟（ms） |
| loss | double | — | 丢包率（0.0–100.0） |
| jitter | int | — | 延迟抖动（ms） |
| dup | int | — | 重复包率（%） |
| unidirectional | boolean | — | 是否单向链路 |
| buffer | int | — | 缓冲队列大小 |

**响应 `data`**：`Link`（含 id、node1Id、node2Id、iface1Id、iface2Id 等原始字段）

---

### 3.3 批量添加链路

```
POST /api/sessions/{sessionId}/links/batch
Content-Type: application/json
```

**请求体**：

```json
{
  "links": [
    { "node1Id": 2001, "node2Id": 2002, "ip4": "10.0.1.1", "ip4Mask": 24, "ip4B": "10.0.1.2", "ip4MaskB": 24 },
    { "node1Id": 2002, "node2Id": 2003, "ip4": "10.0.2.1", "ip4Mask": 24, "ip4B": "10.0.2.2", "ip4MaskB": 24 }
  ]
}
```

**响应 `data`**：`BatchResult`

```json
{
  "succeeded": [ { ...Link }, { ...Link } ],
  "errors": []
}
```

---

### 3.4 编辑链路

```
PUT /api/sessions/{sessionId}/links/{linkId}
Content-Type: application/json
```

**请求体**：同 3.2（node1Id、node2Id 不可变，传了也忽略）

**响应 `data`**：null

---

### 3.5 删除链路

```
DELETE /api/sessions/{sessionId}/links/{linkId}
```

RUNTIME 状态下同时从 CORE 移除链路（跨服务器链路同时清理两端 GRE 隧道节点）。

**响应 `data`**：null

---

## 四、服务器管理 `/api/servers`

### 4.1 获取服务器列表

```
GET /api/servers
```

**响应 `data`**：`Server[]`

```json
[
  {
    "id": 2074351630901534721,
    "name": "core-node-01",
    "host": "192.168.1.10",
    "port": 50051,
    "capacity": 10
  }
]
```

| 字段 | 类型 | 说明 |
|---|---|---|
| id | long | 服务器 ID（雪花 ID） |
| name | string | 服务器名称 |
| host | string | IP 地址 |
| port | int | CORE gRPC 端口（默认 50051） |
| capacity | int | 最大并发场景数（用于负载均衡调度） |

---

### 4.2 获取单个服务器

```
GET /api/servers/{id}
```

**响应 `data`**：`Server`（结构同上）

---

### 4.3 注册服务器

```
POST /api/servers
Content-Type: application/json
```

**请求体**：

```json
{
  "name": "core-node-01",
  "host": "192.168.1.10",
  "port": 50051,
  "capacity": 10
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| name | string | ✓ | 服务器名称 |
| host | string | ✓ | IP 地址 |
| port | int | — | gRPC 端口，默认 50051 |
| capacity | int | — | 最大并发场景数 |

**响应 `data`**：`Server`

---

### 4.4 查询服务器在线状态

```
GET /api/servers/{id}/status
```

通过 gRPC 探测 CORE daemon 是否可达。

**响应 `data`**：

```json
{ "online": true }
```

---

### 4.5 移除服务器

```
DELETE /api/servers/{id}
```

**响应 `data`**：null

---

## 五、AI 对话 `/api/ai`

### 5.1 流式对话

```
POST /api/ai/stream
Content-Type: application/json
Accept: text/event-stream
```

**请求体**：

```json
{
  "conversationId": "conv-abc123",
  "message": "帮我创建一个包含两台Docker节点的仿真场景"
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| conversationId | string | ✓ | 会话 ID，由前端生成并持久化，用于跨请求保持上下文 |
| message | string | ✓ | 用户消息 |

**响应**：SSE 流，每条 `data` 为一段文本 chunk，最后一条固定为 `[DONE]`。

```
data: 好的，我来帮您

data: 创建场景...

data: [DONE]
```

AI 具备以下工具调用能力，可自主编排执行：

| 工具 | 说明 |
|---|---|
| listSessions | 查询所有场景 |
| getSession | 查询单个场景 |
| createSession | 创建场景 |
| startSession | 启动场景 |
| stopSession | 停止场景 |
| deleteSession | 删除场景 |
| listNodes | 查询节点列表 |
| addNode | 添加节点 |
| deleteNode | 删除节点 |
| listLinks | 查询链路列表 |
| addLink | 添加链路 |
| deleteLink | 删除链路 |
| listServers | 查询服务器列表 |

---

### 5.2 清除对话历史

```
DELETE /api/ai/history/{conversationId}
```

清除指定会话的上下文记忆。

**响应**：HTTP 200，无 body

---

## 附录：枚举与说明

### Session.state

| 值 | 说明 |
|---|---|
| `DEFINITION` | 定义阶段，可添加/删除/修改节点和链路 |
| `RUNTIME` | 运行中，支持热添加/删除节点和链路 |
| `SHUTDOWN` | 已停止，资源已释放，可重新 start |

### Link.linkType

| 值 | 说明 |
|---|---|
| `WIRED` | 有线链路（默认） |
| `WIRELESS` | 无线链路 |

### 跨服务器链路（GRE 隧道）

节点分布在不同服务器时，addLink 自动以 GRE 隧道实现互联：
- 两端服务器各自建一个 TUNNEL 类型节点
- 用户节点 ↔ TUNNEL 节点之间建 WIRED 链路，options.key 为 GRE key
- DB 的 `links.tunnel_node1_id` / `tunnel_node2_id` 记录两端 TUNNEL 节点的 CORE ID，供删除链路时清理使用

### 接口名称同步

- `startSession` 完成后自动调用 `getSession` 从 CORE 同步网卡名（`ens7`、`eth0` 等）到 `interfaces.name`
- RUNTIME 热添加链路后，从 `AddLinkResponse` 中直接回写网卡名
- 前端通过 `iface.name` 字段展示 VM 内真实网卡名

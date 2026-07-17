import { apiRequest } from '@/api/request'

export type NodeId = string

export type NodeType = 'DOCKER' | 'QEMU' | 'SWITCH' | 'HUB' | 'WIRELESS_LAN' | 'DEFAULT'

export interface SimulationNode {
  id: NodeId
  sessionId: string
  serverId: string | null
  nodeType: NodeType
  name: string
  model: string | null
  image: string | null
  alt: number
  lon: number
  lat: number
  vcpus: number | null
  memory: number | null
  coreNodeId: number | null
}

export interface AddNodePayload {
  name: string
  nodeType: NodeType
  serverId?: string | null
  image?: string | null
  model?: string | null
  vcpus?: number | null
  memory?: number | null
  alt?: number
  lon?: number
  lat?: number
  connectTo?: NodeId[]
}

export interface BatchAddNodesPayload {
  nodes: AddNodePayload[]
}

export interface UpdateNodePayload {
  name?: string
  serverId?: string | null
  lon?: number
  lat?: number
  alt?: number
}

export interface BatchNodeResult {
  succeeded: SimulationNode[]
  errors: string[]
}

const nodesPath = (sessionId: string) => `/api/sessions/${encodeURIComponent(sessionId)}/nodes`

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeNode(node: SimulationNode): SimulationNode {
  return {
    ...node,
    alt: nullableNumber(node.alt) ?? 0,
    lon: nullableNumber(node.lon) ?? 0,
    lat: nullableNumber(node.lat) ?? 0,
    vcpus: nullableNumber(node.vcpus),
    memory: nullableNumber(node.memory),
    coreNodeId: nullableNumber(node.coreNodeId),
  }
}

export async function getNodes(sessionId: string): Promise<SimulationNode[]> {
  const nodes = await apiRequest<SimulationNode[]>(nodesPath(sessionId))
  return nodes.map(normalizeNode)
}

export async function addNode(sessionId: string, payload: AddNodePayload): Promise<SimulationNode> {
  const node = await apiRequest<SimulationNode>(nodesPath(sessionId), {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return normalizeNode(node)
}

export async function addNodesBatch(
  sessionId: string,
  payload: BatchAddNodesPayload,
): Promise<BatchNodeResult> {
  const result = await apiRequest<BatchNodeResult>(`${nodesPath(sessionId)}/batch`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return {
    ...result,
    succeeded: result.succeeded.map(normalizeNode),
  }
}

export async function updateNode(
  sessionId: string,
  nodeId: NodeId,
  payload: UpdateNodePayload,
): Promise<SimulationNode> {
  const node = await apiRequest<SimulationNode>(
    `${nodesPath(sessionId)}/${encodeURIComponent(nodeId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )
  return normalizeNode(node)
}

//删除
export function deleteNode(sessionId: string, nodeId: NodeId): Promise<null> {
  return apiRequest<null>(`${nodesPath(sessionId)}/${encodeURIComponent(nodeId)}`, {
    method: 'DELETE',
  })
}

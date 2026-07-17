import { apiRequest } from '@/api/request'

export type LinkId = string
export type LinkType = 'WIRED' | 'WIRELESS'

export interface NetworkInterface {
  id: string
  nodeId: string
  ifaceId: number | null
  name: string | null
  mac: string | null
  ip4: string | null
  ip4Mask: number | null
  ip6: string | null
  ip6Mask: number | null
  mtu: number | null
}

export interface SimulationLink {
  id: LinkId
  sessionId: string
  linkType: LinkType
  node1Id: string
  node2Id: string
  iface1Id: string | null
  iface2Id: string | null
  iface1?: NetworkInterface | null
  iface2?: NetworkInterface | null
  bandwidth?: number | null
  delay?: number | null
  loss?: number | null
  jitter?: number | null
  dup?: number | null
  unidirectional?: boolean | null
  buffer?: number | null
}

export interface LinkPayload {
  node1Id: string
  node2Id: string
  linkType?: LinkType
  ip4?: string | null
  ip4Mask?: number | null
  ip4B?: string | null
  ip4MaskB?: number | null
  ip6?: string | null
  ip6Mask?: number | null
  ip6B?: string | null
  ip6MaskB?: number | null
  bandwidth?: number | null
  delay?: number | null
  loss?: number | null
  jitter?: number | null
  dup?: number | null
  unidirectional?: boolean | null
  buffer?: number | null
}

export interface BatchAddLinksPayload {
  links: LinkPayload[]
}

export interface BatchLinkResult {
  succeeded: SimulationLink[]
  errors: string[]
}

const linksPath = (sessionId: string) => `/api/sessions/${encodeURIComponent(sessionId)}/links`

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeInterface(iface: NetworkInterface | null | undefined) {
  if (!iface) return iface
  return {
    ...iface,
    ifaceId: nullableNumber(iface.ifaceId),
    ip4Mask: nullableNumber(iface.ip4Mask),
    ip6Mask: nullableNumber(iface.ip6Mask),
    mtu: nullableNumber(iface.mtu),
  }
}

function normalizeLink(link: SimulationLink): SimulationLink {
  return {
    ...link,
    iface1: normalizeInterface(link.iface1),
    iface2: normalizeInterface(link.iface2),
    bandwidth: nullableNumber(link.bandwidth),
    delay: nullableNumber(link.delay),
    loss: nullableNumber(link.loss),
    jitter: nullableNumber(link.jitter),
    dup: nullableNumber(link.dup),
    buffer: nullableNumber(link.buffer),
  }
}

export async function getLinks(sessionId: string): Promise<SimulationLink[]> {
  const links = await apiRequest<SimulationLink[]>(linksPath(sessionId))
  return links.map(normalizeLink)
}

export async function addLink(sessionId: string, payload: LinkPayload): Promise<SimulationLink> {
  const link = await apiRequest<SimulationLink>(linksPath(sessionId), {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return normalizeLink(link)
}

export async function addLinksBatch(
  sessionId: string,
  payload: BatchAddLinksPayload,
): Promise<BatchLinkResult> {
  const result = await apiRequest<BatchLinkResult>(`${linksPath(sessionId)}/batch`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return {
    ...result,
    succeeded: result.succeeded.map(normalizeLink),
  }
}

export function updateLink(
  sessionId: string,
  linkId: LinkId,
  payload: LinkPayload,
): Promise<null> {
  return apiRequest<null>(`${linksPath(sessionId)}/${encodeURIComponent(linkId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteLink(sessionId: string, linkId: LinkId): Promise<null> {
  return apiRequest<null>(`${linksPath(sessionId)}/${encodeURIComponent(linkId)}`, {
    method: 'DELETE',
  })
}

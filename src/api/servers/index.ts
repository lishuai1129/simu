import { apiRequest } from '@/api/request'

export type ServerId = string

export interface CoreServer {
  id: ServerId
  name: string
  host: string
  port: number
  capacity: number
}

export interface RegisterServerPayload {
  name: string
  host: string
  port: number
  capacity: number
}

export interface ServerStatus {
  online: boolean
}

const serverPath = (id: ServerId) => `/api/servers/${encodeURIComponent(id)}`

export function getServers(): Promise<CoreServer[]> {
  return apiRequest<CoreServer[]>('/api/servers')
}

export function getServer(id: ServerId): Promise<CoreServer> {
  return apiRequest<CoreServer>(serverPath(id))
}

export function registerServer(payload: RegisterServerPayload): Promise<CoreServer> {
  return apiRequest<CoreServer>('/api/servers', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getServerStatus(id: ServerId): Promise<ServerStatus> {
  return apiRequest<ServerStatus>(`${serverPath(id)}/status`)
}

export function deleteServer(id: ServerId): Promise<null> {
  return apiRequest<null>(serverPath(id), { method: 'DELETE' })
}

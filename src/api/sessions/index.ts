import { apiRequest } from '@/api/request'

export type SessionId = string

export type SessionState = 'DEFINITION' | 'RUNTIME' | 'SHUTDOWN'

export interface Session {
  id: SessionId
  name: string
  state: SessionState
  userName: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateSessionPayload {
  name: string
}

const sessionPath = (id: SessionId) => `/api/sessions/${encodeURIComponent(id)}`

export function getSessions(): Promise<Session[]> {
  return apiRequest<Session[]>('/api/sessions')
}

export function getSession(id: SessionId): Promise<Session> {
  return apiRequest<Session>(sessionPath(id))
}

export function createSession(payload: CreateSessionPayload): Promise<Session> {
  return apiRequest<Session>('/api/sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function startSession(id: SessionId): Promise<null> {
  return apiRequest<null>(`${sessionPath(id)}/start`, { method: 'POST' })
}

export function stopSession(id: SessionId): Promise<null> {
  return apiRequest<null>(`${sessionPath(id)}/stop`, { method: 'POST' })
}

export function deleteSession(id: SessionId): Promise<null> {
  return apiRequest<null>(sessionPath(id), { method: 'DELETE' })
}

export function syncSession(id: SessionId): Promise<Session> {
  return apiRequest<Session>(`${sessionPath(id)}/sync`, { method: 'POST' })
}

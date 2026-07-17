import JSONbig from 'json-bigint'

interface ApiResponse<T> {
  code: number
  msg: string
  data: T
}

const jsonParser = JSONbig({ storeAsString: true })
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })

  const responseText = await response.text()
  let payload: ApiResponse<T>

  try {
    payload = jsonParser.parse(responseText) as ApiResponse<T>
  } catch {
    throw new Error(responseText || `请求失败（HTTP ${response.status}）`)
  }

  if (!response.ok || payload.code !== 200) {
    throw new Error(payload.msg || `请求失败（HTTP ${response.status}）`)
  }

  return payload.data
}

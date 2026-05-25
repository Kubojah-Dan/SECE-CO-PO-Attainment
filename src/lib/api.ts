import { useAuthStore } from '@/features/auth/useAuthStore'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

/* ─────────────────────────────────────────────
   ApiError — typed error class
   ───────────────────────────────────────────── */
export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/* ─────────────────────────────────────────────
   Core fetch wrapper
   ───────────────────────────────────────────── */
async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const { token, logout } = useAuthStore.getState()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  /* 401 → logout and hard-redirect */
  if (response.status === 401) {
    logout()
    window.location.href = '/login'
    throw new ApiError(401, 'Session expired. Please sign in again.')
  }

  /* Non-ok response → parse error body */
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const errBody = (await response.json()) as { message?: string }
      if (errBody.message) message = errBody.message
    } catch {
      // ignore parse error — use default message
    }
    throw new ApiError(response.status, message)
  }

  /* 204 No Content */
  if (response.status === 204) {
    return undefined as unknown as T
  }

  return response.json() as Promise<T>
}

/* ─────────────────────────────────────────────
   Public helpers
   ───────────────────────────────────────────── */
export async function apiGet<T>(path: string): Promise<T> {
  return request<T>('GET', path)
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>('POST', path, body)
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  return request<T>('PUT', path, body)
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return request<T>('PATCH', path, body)
}

export async function apiDelete<T>(path: string): Promise<T> {
  return request<T>('DELETE', path)
}

/* ─────────────────────────────────────────────
   apiUpload — multipart/form-data uploads
   Does NOT set Content-Type; browser sets it with boundary automatically
   ───────────────────────────────────────────── */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const { token, logout } = useAuthStore.getState()

  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (response.status === 401) {
    logout()
    window.location.href = '/login'
    throw new ApiError(401, 'Session expired. Please sign in again.')
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const errBody = (await response.json()) as { message?: string }
      if (errBody.message) message = errBody.message
    } catch { /* ignore */ }
    throw new ApiError(response.status, message)
  }

  if (response.status === 204) return undefined as unknown as T
  return response.json() as Promise<T>
}

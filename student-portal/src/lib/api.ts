import axios from 'axios'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('student-auth')
      if (stored) {
        const parsed = JSON.parse(stored)
        const token = parsed?.state?.token
        if (token) config.headers.Authorization = `Bearer ${token}`
      }
    } catch { /* ignore */ }
  }
  return config
})

let isRefreshing = false
let failedQueue: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token))
  failedQueue = []
}

async function tryRefresh(): Promise<string | null> {
  const stored = localStorage.getItem('student-auth')
  const parsed = stored ? JSON.parse(stored) : null
  const refreshToken = parsed?.state?.refreshToken
  if (!refreshToken) return null

  const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken })
  const { token: newToken, refreshToken: newRefresh } = res.data.data

  if (parsed?.state) {
    parsed.state.token = newToken
    if (newRefresh) parsed.state.refreshToken = newRefresh
    localStorage.setItem('student-auth', JSON.stringify(parsed))
    localStorage.setItem('student_token', newToken)
  }
  return newToken
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry && typeof window !== 'undefined') {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }
      originalRequest._retry = true
      isRefreshing = true
      try {
        const newToken = await tryRefresh()
        if (!newToken) throw new Error('No refresh token available')
        processQueue(null, newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch {
        processQueue(null, null)
        const stored = localStorage.getItem('student-auth')
        const parsed = stored ? JSON.parse(stored) : null
        if (!parsed?.state?.refreshToken) {
          localStorage.removeItem('student-auth')
          localStorage.removeItem('student_token')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

export default api

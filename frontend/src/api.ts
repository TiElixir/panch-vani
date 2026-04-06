import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  withCredentials: false,
})

// Inject JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pv_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401, clear token and reload to trigger login redirect
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('pv_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

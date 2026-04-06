import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { jwtDecode } from 'jwt-decode'
import api from '../api'

interface JwtPayload {
  sub: string
  exp: number
}

export interface AuthUser {
  id: string
  email: string
  name: string
  avatar_url: string | null
  is_super_admin: boolean
}

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  loading: boolean
  logout: () => void
  setToken: (token: string) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setTokenState] = useState<string | null>(
    localStorage.getItem('pv_token')
  )
  const [loading, setLoading] = useState(true)

  const logout = () => {
    localStorage.removeItem('pv_token')
    setTokenState(null)
    setUser(null)
  }

  const setToken = (newToken: string) => {
    localStorage.setItem('pv_token', newToken)
    setTokenState(newToken)
  }

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }

    // Check token expiry client-side before making a network call
    try {
      const { exp } = jwtDecode<JwtPayload>(token)
      if (exp * 1000 < Date.now()) {
        logout()
        setLoading(false)
        return
      }
    } catch {
      logout()
      setLoading(false)
      return
    }

    api
      .get<AuthUser>('/auth/me')
      .then(({ data }) => setUser(data))
      .catch(() => logout())
      .finally(() => setLoading(false))
  }, [token])

  return (
    <AuthContext.Provider value={{ user, token, loading, logout, setToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

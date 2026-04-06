import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

/**
 * The backend redirects here after OAuth:
 * /auth/success?token=<jwt>
 * We pluck the token, store it, and redirect to the dashboard.
 */
export default function AuthSuccessPage() {
  const [params] = useSearchParams()
  const { setToken } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const token = params.get('token')
    if (token) {
      setToken(token)
      navigate('/', { replace: true })
    } else {
      navigate('/login', { replace: true })
    }
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}
      >
        <Loader2 size={32} color="var(--color-brand-accent)" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--color-brand-muted)', fontSize: '0.9rem' }}>Signing you in…</p>
      </motion.div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

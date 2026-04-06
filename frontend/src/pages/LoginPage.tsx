import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Vote } from 'lucide-react'
import { motion } from 'framer-motion'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export default function LoginPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true })
  }, [user, loading, navigate])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, #6366f133 0%, transparent 70%)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: '22rem', textAlign: 'center' }}
      >
        {/* Logo mark */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '1rem',
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            boxShadow: '0 0 32px 0 #6366f155',
          }}
        >
          <Vote size={28} color="#fff" />
        </div>

        <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
          Panch<span style={{ color: 'var(--color-brand-accent)' }}>Vani</span>
        </h1>
        <p style={{ margin: '0 0 2rem', color: 'var(--color-brand-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Privacy-first anonymous voting.<br />Your voice, sealed from your identity.
        </p>

        {/* Feature pills */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          {['Double-Blind Ballots', 'Domain-Verified', 'Admin Gated'].map((f) => (
            <span
              key={f}
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                backgroundColor: 'var(--color-brand-surface)',
                border: '1px solid var(--color-brand-border)',
                color: 'var(--color-brand-muted)',
              }}
            >
              {f}
            </span>
          ))}
        </div>

        {/* Sign in button */}
        <a
          href={`${API_URL}/auth/login`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            width: '100%',
            padding: '0.75rem 1.5rem',
            borderRadius: 'var(--radius-button)',
            backgroundColor: 'var(--color-brand-surface)',
            border: '1px solid var(--color-brand-border)',
            color: 'var(--color-brand-text)',
            fontWeight: 600,
            fontSize: '0.9rem',
            textDecoration: 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--color-brand-accent)'
            ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 18px 0 #6366f133'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--color-brand-border)'
            ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none'
          }}
        >
          {/* Google G */}
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </a>

        <p style={{ marginTop: '1.5rem', fontSize: '0.72rem', color: 'var(--color-brand-muted)', lineHeight: 1.6 }}>
          Your vote is cryptographically separated from your identity.<br />
          No one — not even the server — can link your vote to you.
        </p>
      </motion.div>
    </div>
  )
}

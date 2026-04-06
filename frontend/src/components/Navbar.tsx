import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogOut, Vote, ShieldCheck } from 'lucide-react'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        borderBottom: '1px solid #1E293B',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        backgroundColor: 'rgba(0,0,0,0.7)',
      }}
    >
      <div style={{ maxWidth: '64rem', margin: '0 auto', padding: '0 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', height: '3.5rem', gap: '1rem' }}>
          {/* Logo */}
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              textDecoration: 'none',
              color: 'inherit',
              fontWeight: 800,
              fontSize: '1.125rem',
              letterSpacing: '-0.02em',
            }}
          >
            <Vote size={20} color="var(--color-brand-accent)" />
            <span>Panch</span>
            <span style={{ color: 'var(--color-brand-accent)' }}>Vani</span>
          </Link>

          <div style={{ flex: 1 }} />

          {user && (
            <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              {/* Platform Admin link — super admins only */}
              {user.is_super_admin && (
                <Link
                  to="/platform-admin"
                  className="btn-ghost"
                  style={{
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.8rem',
                    color: location.pathname === '/platform-admin'
                      ? 'var(--color-brand-accent)'
                      : undefined,
                    borderColor: location.pathname === '/platform-admin'
                      ? 'var(--color-brand-accent)'
                      : undefined,
                  }}
                >
                  <ShieldCheck size={14} />
                  Admin
                </Link>
              )}

              {/* Avatar + name */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.25rem 0.75rem',
                  borderRadius: 'var(--radius-button)',
                  fontSize: '0.875rem',
                }}
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'var(--color-brand-accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span style={{ color: 'var(--color-brand-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="btn-ghost"
                style={{ padding: '0.4rem 0.625rem' }}
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            </nav>
          )}
        </div>
      </div>
    </header>
  )
}

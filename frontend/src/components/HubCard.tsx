import { useNavigate } from 'react-router-dom'
import { Users, ArrowRight } from 'lucide-react'
import DomainBadge from './DomainBadge'

interface Hub {
  id: string
  name: string
  description?: string
  allowed_domains: string[]
  invite_code: string
}

interface HubCardProps {
  hub: Hub
  isAdmin?: boolean
}

export default function HubCard({ hub, isAdmin }: HubCardProps) {
  const navigate = useNavigate()

  return (
    <div
      className="card"
      style={{ cursor: 'pointer', position: 'relative' }}
      onClick={() => navigate(`/hubs/${hub.id}`)}
    >
      {isAdmin && (
        <span
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            fontSize: '0.65rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--color-brand-accent)',
            backgroundColor: 'var(--color-brand-accent-muted)',
            padding: '0.15rem 0.5rem',
            borderRadius: '999px',
          }}
        >
          Admin
        </span>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
        {/* Icon */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '0.625rem',
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Users size={18} color="#fff" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 700 }}>
            {hub.name}
          </h3>
          {hub.description && (
            <p style={{ margin: '0 0 0.625rem', fontSize: '0.8rem', color: 'var(--color-brand-muted)', lineHeight: 1.5 }}>
              {hub.description}
            </p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {hub.allowed_domains.map((d) => (
              <DomainBadge key={d} domain={d} />
            ))}
          </div>
        </div>

        <ArrowRight size={16} color="var(--color-brand-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
      </div>
    </div>
  )
}

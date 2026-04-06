import { useNavigate } from 'react-router-dom'
import { CheckCircle, Clock, Lock } from 'lucide-react'

interface Poll {
  id: string
  question: string
  options: string[]
  is_active: boolean
  has_voted: boolean
  created_at: string
}

interface PollCardProps {
  poll: Poll
  hubId: string
}

export default function PollCard({ poll, hubId }: PollCardProps) {
  const navigate = useNavigate()

  return (
    <div
      className="card"
      style={{ cursor: 'pointer' }}
      onClick={() => navigate(`/hubs/${hubId}/polls/${poll.id}`)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            {poll.has_voted ? (
              <CheckCircle size={14} color="var(--color-brand-success)" />
            ) : poll.is_active ? (
              <Clock size={14} color="var(--color-brand-warning)" />
            ) : (
              <Lock size={14} color="var(--color-brand-muted)" />
            )}
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: poll.has_voted
                  ? 'var(--color-brand-success)'
                  : poll.is_active
                  ? 'var(--color-brand-warning)'
                  : 'var(--color-brand-muted)',
              }}
            >
              {poll.has_voted ? 'Voted' : poll.is_active ? 'Live' : 'Closed'}
            </span>
          </div>
          <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.4 }}>
            {poll.question}
          </h4>
          <p style={{ margin: '0.375rem 0 0', fontSize: '0.75rem', color: 'var(--color-brand-muted)' }}>
            {poll.options.length} options
          </p>
        </div>
      </div>
    </div>
  )
}

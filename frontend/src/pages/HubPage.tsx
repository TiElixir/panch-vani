import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Settings, Plus, Copy, Check } from 'lucide-react'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import PollCard from '../components/PollCard'
import DomainBadge from '../components/DomainBadge'

interface Hub {
  id: string
  name: string
  description?: string
  admin_id: string
  invite_code: string
  allowed_domains: string[]
}

interface Poll {
  id: string
  question: string
  options: string[]
  is_active: boolean
  has_voted: boolean
  created_at: string
}

export default function HubPage() {
  const { hubId } = useParams<{ hubId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [hub, setHub] = useState<Hub | null>(null)
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  // Create poll modal
  const [showCreate, setShowCreate] = useState(false)
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [duration, setDuration] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get<Hub>(`/hubs/${hubId}`),
      api.get<Poll[]>(`/hubs/${hubId}/polls`),
    ])
      .then(([h, p]) => { setHub(h.data); setPolls(p.data) })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [hubId])

  const isAdmin = user?.id === hub?.admin_id || user?.is_super_admin

  const copyCode = () => {
    if (!hub) return
    navigator.clipboard.writeText(hub.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCreatePoll = async () => {
    const validOptions = options.filter((o) => o.trim())
    if (!question.trim() || validOptions.length < 2) {
      setError('Question and at least 2 options are required.')
      return
    }
    setSubmitting(true); setError('')
    try {
      const { data } = await api.post<Poll>(`/hubs/${hubId}/polls`, {
        question: question.trim(),
        options: validOptions,
        duration_hours: duration ? parseInt(duration, 10) : undefined,
      })
      setPolls([data, ...polls])
      setShowCreate(false); setQuestion(''); setOptions(['', '']); setDuration('')
    } catch (e: any) {
      setError(e.response?.data?.detail ?? 'Failed to create poll')
    } finally { setSubmitting(false) }
  }

  if (loading) return <div className="page-container" style={{ color: 'var(--color-brand-muted)' }}>Loading…</div>
  if (!hub) return null

  return (
    <div className="page-container">
      {/* Hub header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--color-brand-muted)' }}>
          <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>← Dashboard</Link>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ margin: '0 0 0.375rem', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
              {hub.name}
            </h1>
            {hub.description && (
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: 'var(--color-brand-muted)' }}>
                {hub.description}
              </p>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', alignItems: 'center' }}>
              {hub.allowed_domains.map((d) => <DomainBadge key={d} domain={d} />)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            {/* Copy invite code */}
            <button className="btn-ghost" onClick={copyCode} style={{ fontSize: '0.8rem' }}>
              {copied ? <Check size={13} color="var(--color-brand-success)" /> : <Copy size={13} />}
              {copied ? 'Copied!' : hub.invite_code}
            </button>
            {isAdmin && (
              <>
                <Link to={`/hubs/${hubId}/admin`} className="btn-ghost" style={{ fontSize: '0.8rem', textDecoration: 'none' }}>
                  <Settings size={13} /> Manage
                </Link>
                <button className="btn-primary" onClick={() => setShowCreate(true)} style={{ fontSize: '0.8rem' }}>
                  <Plus size={13} /> Poll
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Polls */}
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {polls.length === 0 ? (
          <p style={{ color: 'var(--color-brand-muted)', fontSize: '0.9rem' }}>
            No polls yet. {isAdmin ? 'Create the first one!' : 'Check back soon.'}
          </p>
        ) : (
          polls.map((poll, i) => (
            <motion.div
              key={poll.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <PollCard poll={poll} hubId={hubId!} />
            </motion.div>
          ))
        )}
      </div>

      {/* Create poll modal */}
      {showCreate && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            backgroundColor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={() => setShowCreate(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--color-brand-surface)',
              border: '1px solid var(--color-brand-border)',
              borderRadius: 'var(--radius-card)',
              padding: '1.75rem',
              width: '100%',
              maxWidth: '28rem',
            }}
          >
            <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 700 }}>New Poll</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="label">Question *</label>
                <input className="input" placeholder="Who should be elected as…" value={question} onChange={(e) => setQuestion(e.target.value)} />
              </div>
              <div>
                <label className="label">Options *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {options.map((opt, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        className="input"
                        placeholder={`Option ${i + 1}`}
                        value={opt}
                        onChange={(e) => {
                          const next = [...options]; next[i] = e.target.value; setOptions(next)
                        }}
                      />
                      {options.length > 2 && (
                        <button
                          className="btn-ghost"
                          onClick={() => setOptions(options.filter((_, j) => j !== i))}
                          style={{ padding: '0.4rem 0.6rem', flexShrink: 0 }}
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    className="btn-ghost"
                    onClick={() => setOptions([...options, ''])}
                    style={{ fontSize: '0.8rem', justifyContent: 'flex-start' }}
                  >
                    <Plus size={13} /> Add option
                  </button>
                </div>
              </div>
              {error && <p style={{ color: 'var(--color-brand-danger)', fontSize: '0.8rem', margin: 0 }}>{error}</p>}
              <div>
                <label className="label">Duration (Optional)</label>
                <select className="input" value={duration} onChange={(e) => setDuration(e.target.value)}>
                  <option value="">No Expiry</option>
                  <option value="1">1 Hour</option>
                  <option value="24">24 Hours</option>
                  <option value="48">48 Hours</option>
                  <option value="168">1 Week</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button className="btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button className="btn-primary" onClick={handleCreatePoll} disabled={submitting}>
                  {submitting ? 'Creating…' : 'Create Poll'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

// Missing import used in HubPage
function X({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

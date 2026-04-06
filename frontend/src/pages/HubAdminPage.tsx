import { useEffect, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, X, Settings } from 'lucide-react'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/StatusBadge'

interface MemberUser {
  id: string
  email: string
  name: string
  avatar_url: string | null
}

interface Membership {
  hub_id: string
  user_id: string
  status: string
  verification_id: string | null
  joined_at: string
  user: MemberUser
}

interface Hub {
  id: string
  name: string
  admin_id: string
  allowed_domains: string[]
}

export default function HubAdminPage() {
  const { hubId } = useParams<{ hubId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [hub, setHub] = useState<Hub | null>(null)
  const [members, setMembers] = useState<Membership[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pending' | 'all'>('pending')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Domain management
  const [domains, setDomains] = useState<string[]>([])
  const [domainInput, setDomainInput] = useState('')
  const [savingDomains, setSavingDomains] = useState(false)
  const [domainMsg, setDomainMsg] = useState('')

  const fetchMembers = (endpoint: string) =>
    api.get<Membership[]>(endpoint).then(({ data }) => setMembers(data))

  useEffect(() => {
    Promise.all([api.get<Hub>(`/hubs/${hubId}`)])
      .then(([h]) => {
        const hub = h.data
        if (hub.admin_id !== user?.id && !user?.is_super_admin) {
          navigate(`/hubs/${hubId}`)
          return
        }
        setHub(hub)
        setDomains(hub.allowed_domains)
        fetchMembers(`/hubs/${hubId}/admin/pending`)
      })
      .finally(() => setLoading(false))
  }, [hubId])

  useEffect(() => {
    if (!hub) return
    const ep = tab === 'pending'
      ? `/hubs/${hubId}/admin/pending`
      : `/hubs/${hubId}/admin/members`
    fetchMembers(ep)
  }, [tab, hub])

  const approve = async (userId: string) => {
    setActionLoading(userId)
    await api.patch(`/hubs/${hubId}/admin/approve/${userId}`).catch(() => {})
    await fetchMembers(tab === 'pending' ? `/hubs/${hubId}/admin/pending` : `/hubs/${hubId}/admin/members`)
    setActionLoading(null)
  }

  const reject = async (userId: string) => {
    setActionLoading(userId)
    await api.delete(`/hubs/${hubId}/admin/reject/${userId}`).catch(() => {})
    await fetchMembers(tab === 'pending' ? `/hubs/${hubId}/admin/pending` : `/hubs/${hubId}/admin/members`)
    setActionLoading(null)
  }

  const addDomain = () => {
    const d = domainInput.trim().replace(/^@/, '').toLowerCase()
    if (d && !domains.includes(d)) setDomains([...domains, d])
    setDomainInput('')
  }
  const handleDomainKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addDomain() }
  }

  const saveDomains = async () => {
    setSavingDomains(true); setDomainMsg('')
    try {
      await api.patch(`/hubs/${hubId}/admin/domains`, { allowed_domains: domains })
      setDomainMsg('Saved!')
      setTimeout(() => setDomainMsg(''), 2000)
    } catch {
      setDomainMsg('Failed to save')
    } finally { setSavingDomains(false) }
  }

  if (loading) return <div className="page-container" style={{ color: 'var(--color-brand-muted)' }}>Loading…</div>
  if (!hub) return null

  return (
    <div className="page-container">
      <div style={{ marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--color-brand-muted)' }}>
        <Link to={`/hubs/${hubId}`} style={{ color: 'inherit', textDecoration: 'none' }}>← {hub.name}</Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '2rem' }}>
        <Settings size={18} color="var(--color-brand-accent)" />
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Hub Admin</h1>
      </div>

      {/* ── Domain config ── */}
      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700 }}>
          Allowed Email Domains
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.625rem' }}>
          <input
            className="input"
            placeholder="students.iiests.ac.in"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            onKeyDown={handleDomainKey}
            style={{ flex: 1 }}
          />
          <button className="btn-ghost" onClick={addDomain}>Add</button>
        </div>
        {domains.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.875rem' }}>
            {domains.map((d) => (
              <span
                key={d}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                  padding: '0.2rem 0.5rem', borderRadius: '999px',
                  fontSize: '0.72rem', fontWeight: 600, fontFamily: 'monospace',
                  color: 'var(--color-brand-accent)',
                  backgroundColor: 'var(--color-brand-accent-muted)',
                  border: '1px solid #6366f133',
                }}
              >
                @{d}
                <button
                  onClick={() => setDomains(domains.filter((x) => x !== d))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-brand-accent)', display: 'flex' }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </span>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn-primary" onClick={saveDomains} disabled={savingDomains} style={{ fontSize: '0.8rem' }}>
            {savingDomains ? 'Saving…' : 'Save Domains'}
          </button>
          {domainMsg && (
            <span style={{ fontSize: '0.8rem', color: domainMsg === 'Saved!' ? 'var(--color-brand-success)' : 'var(--color-brand-danger)' }}>
              {domainMsg}
            </span>
          )}
        </div>
      </section>

      {/* ── Members section ── */}
      <section>
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem' }}>
          {(['pending', 'all'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '0.375rem 0.875rem',
                borderRadius: 'var(--radius-button)',
                border: '1px solid',
                borderColor: tab === t ? 'var(--color-brand-accent)' : 'var(--color-brand-border)',
                background: tab === t ? 'var(--color-brand-accent-muted)' : 'transparent',
                color: tab === t ? 'var(--color-brand-accent)' : 'var(--color-brand-muted)',
                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {t === 'pending' ? 'Pending' : 'All Members'}
            </button>
          ))}
        </div>

        {members.length === 0 ? (
          <p style={{ color: 'var(--color-brand-muted)', fontSize: '0.875rem' }}>
            {tab === 'pending' ? 'No pending requests.' : 'No members yet.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {members.map((m, i) => (
              <motion.div
                key={m.user_id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="card"
                style={{ padding: '1rem 1.25rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.8rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                    }}
                  >
                    {m.user?.name?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem' }}>{m.user?.name ?? 'Unknown'}</p>
                    <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: 'var(--color-brand-muted)' }}>
                      {m.user?.email}
                      {m.verification_id && <> · <span style={{ fontFamily: 'monospace' }}>{m.verification_id}</span></>}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    <StatusBadge status={m.status} />
                    {m.status === 'pending' && (
                      <>
                        <button
                          className="btn-primary"
                          onClick={() => approve(m.user_id)}
                          disabled={actionLoading === m.user_id}
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          <Check size={12} /> Approve
                        </button>
                        <button
                          className="btn-ghost"
                          onClick={() => reject(m.user_id)}
                          disabled={actionLoading === m.user_id}
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: 'var(--color-brand-danger)', borderColor: 'var(--color-brand-danger)' }}
                        >
                          <X size={12} /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}



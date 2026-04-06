import { useState, useEffect } from 'react'
import type { KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Hash } from 'lucide-react'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import HubCard from '../components/HubCard'

interface Hub {
  id: string
  name: string
  description?: string
  allowed_domains: string[]
  invite_code: string
}

type Modal = 'create' | 'join' | null

export default function DashboardPage() {
  const { user } = useAuth()
  const [hubs, setHubs] = useState<Hub[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Modal>(null)

  // Create form state
  const [hubName, setHubName] = useState('')
  const [hubDesc, setHubDesc] = useState('')
  const [domains, setDomains] = useState<string[]>([])
  const [domainInput, setDomainInput] = useState('')

  // Join form state
  const [inviteCode, setInviteCode] = useState('')
  const [verificationId, setVerificationId] = useState('')
  const [joinHubId, setJoinHubId] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fetchHubs = () => {
    setLoading(true)
    api.get<Hub[]>('/hubs').then(({ data }) => setHubs(data)).finally(() => setLoading(false))
  }

  useEffect(() => { fetchHubs() }, [])

  const addDomain = () => {
    const d = domainInput.trim().replace(/^@/, '').toLowerCase()
    if (d && !domains.includes(d)) setDomains([...domains, d])
    setDomainInput('')
  }

  const handleDomainKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addDomain() }
  }

  const handleCreate = async () => {
    if (!hubName.trim() || domains.length === 0) {
      setError('Hub name and at least one email domain are required.')
      return
    }
    setSubmitting(true); setError('')
    try {
      await api.post('/hubs', { name: hubName.trim(), description: hubDesc.trim() || undefined, allowed_domains: domains })
      setModal(null); setHubName(''); setHubDesc(''); setDomains([])
      fetchHubs()
    } catch (e: any) {
      setError(e.response?.data?.detail ?? 'Failed to create hub')
    } finally { setSubmitting(false) }
  }

  const handleJoin = async () => {
    if (!inviteCode.trim() && !joinHubId.trim()) { setError('Enter an invite code or Hub ID.'); return }
    setSubmitting(true); setError('')
    try {
      // Use invite_code to look up hub_id
      await api.get<Hub[]>('/hubs').catch(() => ({ data: [] as Hub[] }))
      // We'll just post to /hubs/join with invite_code; backend handles lookup
      const targetId = joinHubId.trim() || 'lookup'
      await api.post(`/hubs/${targetId}/join`, {
        invite_code: inviteCode.trim(),
        verification_id: verificationId.trim() || undefined,
      })
      setModal(null); setInviteCode(''); setVerificationId(''); setJoinHubId('')
      fetchHubs()
    } catch (e: any) {
      setError(e.response?.data?.detail ?? 'Failed to submit join request')
    } finally { setSubmitting(false) }
  }

  const closeModal = () => { setModal(null); setError('') }

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <p style={{ margin: '0 0 0.25rem', fontSize: '0.8rem', color: 'var(--color-brand-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            Welcome back
          </p>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            Your Hubs
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-ghost" onClick={() => { setModal('join'); setError('') }}>
            <Hash size={14} /> Join Hub
          </button>
          <button className="btn-primary" onClick={() => { setModal('create'); setError('') }}>
            <Plus size={14} /> Create Hub
          </button>
        </div>
      </div>

      {/* Hub grid */}
      {loading ? (
        <p style={{ color: 'var(--color-brand-muted)' }}>Loading…</p>
      ) : hubs.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            borderRadius: 'var(--radius-card)',
            border: '1px dashed var(--color-brand-border)',
            color: 'var(--color-brand-muted)',
          }}
        >
          <p style={{ margin: '0 0 1rem', fontSize: '1rem' }}>You haven't joined any Hubs yet.</p>
          <button className="btn-primary" onClick={() => setModal('create')}><Plus size={14} /> Create your first Hub</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.875rem' }}>
          {hubs.map((hub) => (
            <motion.div key={hub.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <HubCard hub={hub} isAdmin={hub.id === user?.id} />
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              backgroundColor: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '1.5rem',
            }}
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--color-brand-surface)',
                border: '1px solid var(--color-brand-border)',
                borderRadius: 'var(--radius-card)',
                padding: '1.75rem',
                width: '100%',
                maxWidth: '26rem',
              }}
            >
              {modal === 'create' ? (
                <>
                  <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 700 }}>Create a Hub</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label className="label">Hub Name *</label>
                      <input className="input" placeholder="e.g. IIEST Hostel Council" value={hubName} onChange={(e) => setHubName(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Description</label>
                      <input className="input" placeholder="Optional short description" value={hubDesc} onChange={(e) => setHubDesc(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Allowed Email Domains *</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          className="input"
                          placeholder="students.iiests.ac.in"
                          value={domainInput}
                          onChange={(e) => setDomainInput(e.target.value)}
                          onKeyDown={handleDomainKeyDown}
                          style={{ flex: 1 }}
                        />
                        <button className="btn-ghost" onClick={addDomain} style={{ flexShrink: 0 }}>Add</button>
                      </div>
                      <p style={{ margin: '0.375rem 0 0', fontSize: '0.72rem', color: 'var(--color-brand-muted)' }}>
                        Press Enter or comma to add. Users must have a matching email to join.
                      </p>
                      {domains.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.625rem' }}>
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
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {error && <p style={{ color: 'var(--color-brand-danger)', fontSize: '0.8rem', margin: 0 }}>{error}</p>}
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button className="btn-ghost" onClick={closeModal}>Cancel</button>
                      <button className="btn-primary" onClick={handleCreate} disabled={submitting}>
                        {submitting ? 'Creating…' : 'Create Hub'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 700 }}>Join a Hub</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label className="label">Hub ID</label>
                      <input className="input" placeholder="Paste Hub ID" value={joinHubId} onChange={(e) => setJoinHubId(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Invite Code (optional)</label>
                      <input className="input" placeholder="8-character invite code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Verification ID (optional)</label>
                      <input className="input" placeholder="e.g. Student Roll No." value={verificationId} onChange={(e) => setVerificationId(e.target.value)} />
                    </div>
                    {error && <p style={{ color: 'var(--color-brand-danger)', fontSize: '0.8rem', margin: 0 }}>{error}</p>}
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button className="btn-ghost" onClick={closeModal}>Cancel</button>
                      <button className="btn-primary" onClick={handleJoin} disabled={submitting}>
                        {submitting ? 'Submitting…' : 'Request to Join'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldAlert, Trash2, Shield, Activity, Users, Layers, Vote } from 'lucide-react'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import DomainBadge from '../components/DomainBadge'

interface Stats {
  total_users: number
  total_hubs: number
  total_polls: number
  total_votes: number
}

interface HubInfo {
  id: string
  name: string
  description?: string
  admin_email: string
  member_count: number
  poll_count: number
  allowed_domains: string[]
  created_at: string
}

export default function PlatformAdminPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [hubs, setHubs] = useState<HubInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchData = () => {
    Promise.all([
      api.get<Stats>('/superadmin/stats'),
      api.get<HubInfo[]>('/superadmin/hubs'),
    ])
      .then(([s, h]) => { setStats(s.data); setHubs(h.data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const deleteHub = async (id: string, name: string) => {
    if (!window.confirm(`Are you absolutely sure you want to delete the hub "${name}"? This deletes all its polls, votes, and memberships.`)) return
    setActionLoading(id)
    await api.delete(`/superadmin/hubs/${id}`).catch(() => {})
    await fetchData()
    setActionLoading(null)
  }

  if (loading) return <div className="page-container" style={{ color: 'var(--color-brand-muted)' }}>Loading…</div>
  if (!user?.is_super_admin) return null // Handled by router too, but fallback

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <ShieldAlert size={24} color="var(--color-brand-danger)" />
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-brand-danger)' }}>Platform Super Admin</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-brand-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>God Mode Enabled</p>
        </div>
      </div>

      {stats && (
        <section style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
          gap: '1rem', 
          marginBottom: '2rem' 
        }}>
          {[
            { label: 'Total Users', val: stats.total_users, i: <Users size={16} /> },
            { label: 'Total Hubs', val: stats.total_hubs, i: <Layers size={16} /> },
            { label: 'Total Polls', val: stats.total_polls, i: <Vote size={16} /> },
            { label: 'Total Votes', val: stats.total_votes, i: <Activity size={16} /> },
          ].map((item, idx) => (
            <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
              className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-brand-muted)', marginBottom: '0.5rem' }}>
                {item.i}
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>{item.label}</span>
              </div>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1 }}>{item.val}</span>
            </motion.div>
          ))}
        </section>
      )}

      <section>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem', fontWeight: 700 }}>All Platform Hubs</h2>
        {hubs.length === 0 ? (
          <p style={{ color: 'var(--color-brand-muted)' }}>No hubs exist yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {hubs.map((hub, i) => (
              <motion.div key={hub.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', padding: '1.25rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', fontWeight: 700 }}>{hub.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-brand-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                    <Shield size={12} /> Admin: <span style={{ fontFamily: 'monospace', color: 'var(--color-brand-text)' }}>{hub.admin_email}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--color-brand-muted)', marginBottom: '0.75rem' }}>
                    <span>{hub.member_count} members</span>
                    <span>{hub.poll_count} polls</span>
                    <span>Created {new Date(hub.created_at).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                    {hub.allowed_domains.map(d => <DomainBadge key={d} domain={d} />)}
                  </div>
                </div>
                
                <button 
                  onClick={() => deleteHub(hub.id, hub.name)}
                  disabled={actionLoading === hub.id}
                  className="btn-ghost" 
                  style={{ color: 'var(--color-brand-danger)', borderColor: 'var(--color-brand-danger)' }}
                >
                  {actionLoading === hub.id ? 'Deleting...' : <><Trash2 size={14}/> Delete</>}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

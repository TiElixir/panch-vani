import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Lock, BarChart2 } from 'lucide-react'
import api from '../api'
import ResultBar from '../components/ResultBar'

interface Poll {
  id: string
  hub_id: string
  question: string
  options: string[]
  is_active: boolean
  has_voted: boolean
  expires_at: string | null
}

interface Results {
  poll_id: string
  question: string
  options: string[]
  tallies: number[]
  total_votes: number
  is_active: boolean
}

interface Voter {
  id: string
  name: string
  email: string
}

export default function PollPage() {
  const { hubId, pollId } = useParams<{ hubId: string; pollId: string }>()

  const [poll, setPoll] = useState<Poll | null>(null)
  const [results, setResults] = useState<Results | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)
  const [error, setError] = useState('')
  const [voted, setVoted] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [voters, setVoters] = useState<Voter[]>([])

  const isExpired = poll?.expires_at ? new Date(poll.expires_at).getTime() < Date.now() : false
  const active = poll?.is_active && !isExpired

  const fetchPoll = () =>
    api.get<Poll>(`/polls/${pollId}`).then(({ data }) => {
      setPoll(data)
      setVoted(data.has_voted)
      if (data.has_voted || !data.is_active) fetchResults()
    })

const fetchResults = () => {
    api.get<Results>(`/polls/${pollId}/results`)
      .then(({ data }) => { setResults(data); setShowResults(true) })
      .catch(() => {})
    
    api.get<Voter[]>(`/polls/${pollId}/voters`)
      .then(({ data }) => { setVoters(data) })
      .catch(() => {})
  }

  useEffect(() => {
    setLoading(true)
    fetchPoll().finally(() => setLoading(false))
  }, [pollId])

  const handleVote = async () => {
    if (selected === null) return
    setVoting(true); setError('')
    try {
      await api.post(`/polls/${pollId}/vote`, { option_index: selected })
      setVoted(true)
      await fetchResults()
    } catch (e: any) {
      setError(e.response?.data?.detail ?? 'Failed to cast vote')
    } finally { setVoting(false) }
  }

  if (loading) return <div className="page-container" style={{ color: 'var(--color-brand-muted)' }}>Loading…</div>
  if (!poll) return null


  return (
    <div className="page-container" style={{ maxWidth: '40rem' }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--color-brand-muted)' }}>
          <Link to={`/hubs/${hubId}`} style={{ color: 'inherit', textDecoration: 'none' }}>← Hub</Link>
        </div>

        {/* Status banner */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            fontSize: '0.72rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            padding: '0.25rem 0.75rem',
            borderRadius: '999px',
            marginBottom: '1rem',
            color: voted
              ? 'var(--color-brand-success)'
              : active
              ? 'var(--color-brand-warning)'
              : 'var(--color-brand-muted)',
            backgroundColor: voted
              ? '#10b98122'
              : active
              ? '#f59e0b22'
              : '#1e293b',
          }}
        >
          {voted ? <CheckCircle size={12} /> : active ? null : <Lock size={12} />}
          {voted ? 'Vote Cast' : active ? 'Live Poll' : 'Poll Closed'}
        </div>

        <h1 style={{ margin: '0 0 1.75rem', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.3 }}>
          {poll.question}
        </h1>

        {/* Voting UI */}
        {!voted && active && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.25rem' }}>
              {poll.options.map((opt, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  onClick={() => setSelected(i)}
                  style={{
                    width: '100%',
                    padding: '0.875rem 1.125rem',
                    borderRadius: 'var(--radius-button)',
                    border: selected === i
                      ? '1px solid var(--color-brand-accent)'
                      : '1px solid var(--color-brand-border)',
                    background: selected === i
                      ? 'var(--color-brand-accent-muted)'
                      : 'var(--color-brand-surface)',
                    color: selected === i ? 'var(--color-brand-text)' : 'var(--color-brand-muted)',
                    textAlign: 'left',
                    fontSize: '0.9rem',
                    fontWeight: selected === i ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                  }}
                >
                  <span
                    style={{
                      width: 18, height: 18,
                      borderRadius: '50%',
                      border: selected === i ? '2px solid var(--color-brand-accent)' : '2px solid var(--color-brand-border)',
                      backgroundColor: selected === i ? 'var(--color-brand-accent)' : 'transparent',
                      flexShrink: 0,
                      transition: 'all 0.15s',
                    }}
                  />
                  {opt}
                </motion.button>
              ))}
            </div>

            {error && <p style={{ color: 'var(--color-brand-danger)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{error}</p>}

            <button
              className="btn-primary"
              onClick={handleVote}
              disabled={selected === null || voting}
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
            >
              {voting ? 'Casting your vote…' : 'Cast Vote'}
            </button>

            <p style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: 'var(--color-brand-muted)', textAlign: 'center', lineHeight: 1.6 }}>
              🔒 Your identity is permanently separated from your ballot before it is recorded.
            </p>
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {showResults && results && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <BarChart2 size={15} color="var(--color-brand-accent)" />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-brand-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Results · {results.total_votes} vote{results.total_votes !== 1 ? 's' : ''}
                </span>
              </div>
              {results.options.map((opt, i) => (
                <ResultBar
                  key={i}
                  label={opt}
                  count={results.tallies[i]}
                  total={results.total_votes}
                  isWinner={results.tallies[i] === Math.max(...results.tallies) && results.tallies[i] > 0}
                />
              ))}
              
              {voters.length > 0 && (
                <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-brand-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-brand-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Admin View: Voter Ledger
                    </span>
                  </div>
                  <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: 'var(--color-brand-muted)', lineHeight: 1.5 }}>
                    As an admin, you can verify which members participated. It is cryptographically impossible to trace these voters to their actual vote selections.
                  </p>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {voters.map(v => (
                      <div key={v.id} style={{ padding: '0.75rem', background: 'var(--color-brand-surface-2)', borderRadius: 'var(--radius-button)', fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 600 }}>{v.name}</div>
                        <div style={{ color: 'var(--color-brand-muted)', fontSize: '0.75rem' }}>{v.email}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

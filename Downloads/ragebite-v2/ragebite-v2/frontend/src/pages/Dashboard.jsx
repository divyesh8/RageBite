import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { userAPI } from '../lib/api'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [data, setData]     = useState(null)
  const [battles, setBattles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: res } = await userAPI.dashboard()
        setData(res.user)
        setBattles(res.battles || [])
      } catch (err) {
        toast.error('Failed to load dashboard data.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const u = data || user

  const RANK_COLORS = {
    'Rookie': '#888', 'Flame Starter': '#FF8C00', 'Roast Apprentice': '#FFB800',
    'Savage': '#FF3C1A', 'Inferno': '#FF3C1A', 'Aura God': '#FFB800',
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-rb-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-rb-fire border-t-transparent rounded-full animate-spin" />
          <p className="font-mono text-[11px] text-rb-muted tracking-widest">LOADING YOUR STATS...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-rb-bg" style={{
      backgroundImage: 'linear-gradient(rgba(255,60,26,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,60,26,.04) 1px,transparent 1px)',
      backgroundSize: '48px 48px',
    }}>
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-rb-border bg-rb-surface/90 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-rb-fire rounded-lg flex items-center justify-center text-base">🔥</div>
            <span className="font-display text-xl tracking-widest">RAGE<span className="text-rb-fire">BITE</span></span>
          </div>
          <div className="flex items-center gap-4">
            {/* Aura chip */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
              style={{ background: 'rgba(255,184,0,.08)', borderColor: 'rgba(255,184,0,.25)' }}>
              <span className="font-display text-lg text-rb-gold">⚡</span>
              <span className="font-display text-xl text-rb-gold">{(u?.aura || 0).toLocaleString()}</span>
              <span className="font-mono text-[9px] text-rb-muted">AURA</span>
            </div>
            {/* User chip */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-rb-border bg-rb-card">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'rgba(255,60,26,.15)', border: '1px solid rgba(255,60,26,.4)', color: '#FF3C1A' }}>
                {u?.username?.[0]?.toUpperCase()}
              </div>
              <span className="font-mono text-[11px] text-rb-muted">@{u?.username}</span>
            </div>
            <button onClick={logout}
              className="font-mono text-[10px] text-rb-muted hover:text-rb-fire transition-colors px-3 py-1.5 border border-rb-border rounded-lg">
              LOGOUT
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* Welcome */}
        <div className="animate-slide-up">
          <p className="font-mono text-[11px] text-rb-fire tracking-widest mb-1">WELCOME BACK</p>
          <h1 className="font-display text-5xl tracking-wider">@{u?.username?.toUpperCase()}</h1>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <span className="font-mono text-[11px] px-3 py-1.5 rounded-lg border"
              style={{ color: RANK_COLORS[u?.rank] || '#888', borderColor: RANK_COLORS[u?.rank] || '#333', background: 'rgba(0,0,0,.3)' }}>
              🏆 {u?.rank}
            </span>
            <span className="font-mono text-[11px] text-rb-muted">
              Joined {u?.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''}
            </span>
            {!u?.email_verified && (
              <span className="font-mono text-[10px] text-rb-gold px-2 py-1 rounded border border-rb-gold/30 bg-rb-gold/5">
                ⚠️ Email not verified
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'AURA',         value: (u?.aura || 0).toLocaleString(), color: '#FFB800', icon: '⚡' },
            { label: 'WINS',         value: u?.wins || 0,                    color: '#00E676', icon: '🏆' },
            { label: 'LOSSES',       value: u?.losses || 0,                  color: '#FF3C1A', icon: '💀' },
            { label: 'WIN RATE',     value: `${u?.win_rate || 0}%`,          color: '#F2EEE8', icon: '📊' },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className="rounded-2xl p-5 border border-rb-border text-center animate-slide-up"
              style={{ background: 'rgba(255,255,255,.02)' }}>
              <div className="text-2xl mb-2">{icon}</div>
              <div className="font-display text-4xl mb-1" style={{ color }}>{value}</div>
              <div className="font-mono text-[9px] text-rb-muted tracking-widest">{label}</div>
            </div>
          ))}
        </div>

        {/* More stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'TOTAL BATTLES',   value: u?.total_battles || 0,    color: '#F2EEE8' },
            { label: 'CURRENT STREAK',  value: u?.current_streak || 0,   color: '#FFB800' },
            { label: 'HIGHEST STREAK',  value: u?.highest_streak || 0,   color: '#00E676' },
            { label: 'RANK',            value: u?.rank || 'Rookie',      color: RANK_COLORS[u?.rank] || '#888' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl p-4 border border-rb-border text-center"
              style={{ background: 'rgba(255,255,255,.015)' }}>
              <div className="font-display text-2xl mb-1" style={{ color, fontSize: typeof value === 'string' && value.length > 6 ? '16px' : undefined }}>{value}</div>
              <div className="font-mono text-[9px] text-rb-muted tracking-widest">{label}</div>
            </div>
          ))}
        </div>

        {/* Battle History */}
        <div className="rounded-2xl border border-rb-border overflow-hidden" style={{ background: 'rgba(255,255,255,.02)' }}>
          <div className="px-6 py-4 border-b border-rb-border">
            <h2 className="font-display text-2xl tracking-wider">BATTLE HISTORY</h2>
          </div>
          {battles.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-4xl mb-3">⚔️</div>
              <p className="font-mono text-[12px] text-rb-muted">No battles yet. Challenge someone to earn Aura!</p>
            </div>
          ) : (
            <div className="divide-y divide-rb-border">
              {battles.map(b => (
                <div key={b.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: b.won ? 'rgba(0,230,118,.1)' : 'rgba(255,60,26,.1)', border: `1px solid ${b.won ? 'rgba(0,230,118,.25)' : 'rgba(255,60,26,.25)'}` }}>
                    {b.won ? '⚡' : '💀'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">vs @{b.opponent_username}</div>
                    <div className="font-mono text-[10px] text-rb-muted">{b.topic}</div>
                  </div>
                  <div className="font-display text-lg" style={{ color: b.won ? '#00E676' : '#FF3C1A' }}>
                    {b.won ? `+${b.aura_delta}` : `-${Math.abs(b.aura_delta)}`} ⚡
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Coming soon */}
        <div className="rounded-2xl border border-rb-border p-10 text-center" style={{ background: 'rgba(255,255,255,.015)' }}>
          <div className="text-5xl mb-4">🔥</div>
          <h2 className="font-display text-3xl tracking-widest mb-2">ARENA COMING SOON</h2>
          <p className="font-mono text-[12px] text-rb-muted">Roast battles, Rage Groups, and Leaderboards are being built.</p>
        </div>
      </main>
    </div>
  )
}

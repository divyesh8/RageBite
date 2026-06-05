import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import AuthLayout from '../components/auth/AuthLayout'
import InputField from '../components/auth/InputField'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { login } = useAuth()

  const [fields, setFields]   = useState({ identifier: '', password: '', rememberMe: false })
  const [errors, setErrors]   = useState({})
  const [touched, setTouched] = useState({})
  const [loading, setLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)

  const set = (name, val) => {
    setFields(f => ({ ...f, [name]: val }))
    if (touched[name] && errors[name]) setErrors(e => ({ ...e, [name]: null }))
  }

  const blur = (name) => {
    setTouched(t => ({ ...t, [name]: true }))
    if (!fields[name]) setErrors(e => ({ ...e, [name]: name === 'identifier' ? 'Email or username is required' : 'Password is required' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = {}
    if (!fields.identifier) newErrors.identifier = 'Email or username is required'
    if (!fields.password)   newErrors.password   = 'Password is required'
    if (Object.keys(newErrors).length) { setErrors(newErrors); setTouched({ identifier: true, password: true }); return }

    setLoading(true)
    try {
      await login(fields.identifier, fields.password, fields.rememberMe)
      toast.success('Welcome back! 🔥')
      const from = location.state?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    } catch (err) {
      const data = err.response?.data
      setAttempts(a => a + 1)
      if (err.response?.status === 403 && data?.code === 'EMAIL_NOT_VERIFIED') {
        toast.error('Please verify your email first.')
        navigate('/register', { state: { userId: data.userId, email: data.email, step: 'otp' } })
      } else if (err.response?.status === 429) {
        toast.error('Too many attempts. Please wait 15 minutes.')
      } else {
        toast.error(data?.message || 'Invalid credentials.')
        setErrors({ identifier: ' ', password: 'Invalid email/username or password' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout tag="WELCOME BACK" title="LOG IN" subtitle="Your Aura is waiting. Get back in the arena.">
      <div className="card">
        {attempts >= 3 && (
          <div className="mb-4 p-3 rounded-xl border border-rb-fire/30 bg-rb-fire/5">
            <p className="font-mono text-[11px] text-rb-fire">
              ⚠️ {5 - attempts} attempt{5 - attempts !== 1 ? 's' : ''} remaining before temporary lockout.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <InputField
            label="EMAIL OR USERNAME" name="identifier"
            value={fields.identifier} onChange={e => set('identifier', e.target.value)}
            onBlur={() => blur('identifier')}
            error={touched.identifier ? errors.identifier : null}
            valid={touched.identifier && !errors.identifier && !!fields.identifier}
            placeholder="you@email.com or @handle" autoComplete="username email"
          />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">PASSWORD</label>
              <Link to="/forgot-password" className="font-mono text-[10px] text-rb-muted hover:text-rb-fire transition-colors tracking-wider">
                FORGOT?
              </Link>
            </div>
            <InputField
              name="password" type="password"
              value={fields.password} onChange={e => set('password', e.target.value)}
              onBlur={() => blur('password')}
              error={touched.password ? errors.password : null}
              placeholder="Your password" autoComplete="current-password"
            />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={fields.rememberMe}
              onChange={e => set('rememberMe', e.target.checked)}
              className="w-4 h-4 rounded appearance-none border border-rb-border bg-rb-card checked:bg-rb-fire checked:border-rb-fire cursor-pointer" />
            <span className="font-mono text-[11px] text-rb-muted">REMEMBER ME FOR 7 DAYS</span>
          </label>

          <button type="submit" disabled={loading} className="btn-fire">
            {loading ? <><div className="spinner" />LOGGING IN...</> : 'LOG IN ↗'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-rb-border" />
          <span className="font-mono text-[10px] text-rb-muted tracking-widest">OR</span>
          <div className="flex-1 h-px bg-rb-border" />
        </div>

        <p className="text-center font-mono text-[11px] text-rb-muted">
          No account?{' '}
          <Link to="/register" className="text-rb-fire underline underline-offset-2 hover:text-rb-text transition-colors">
            SIGN UP FREE
          </Link>
        </p>
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        {[
          { val: '12.4K', label: 'FIGHTERS',     icon: '⚔️' },
          { val: '847',   label: 'BATTLES TODAY', icon: '🔥' },
          { val: '2.1M',  label: 'AURA MOVED',   icon: '⚡' },
        ].map(({ val, label, icon }) => (
          <div key={label} className="rounded-xl p-3 border border-rb-border text-center bg-white/[.02]">
            <div className="text-lg mb-1">{icon}</div>
            <div className="font-display text-xl text-rb-text">{val}</div>
            <div className="font-mono text-[8px] text-rb-muted tracking-wider">{label}</div>
          </div>
        ))}
      </div>
    </AuthLayout>
  )
}

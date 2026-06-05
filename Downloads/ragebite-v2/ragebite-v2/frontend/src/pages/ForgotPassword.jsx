import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import AuthLayout from '../components/auth/AuthLayout'
import InputField from '../components/auth/InputField'
import { authAPI } from '../lib/api'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPassword() {
  const [email, setEmail]       = useState('')
  const [error, setError]       = useState('')
  const [touched, setTouched]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [userId, setUserId]     = useState('')
  const [resendCd, setResendCd] = useState(0)

  const validate = (v) => {
    if (!v) return 'Email is required'
    if (!EMAIL_RE.test(v)) return 'Enter a valid email address'
    return ''
  }

  const startCooldown = () => {
    let n = 60; setResendCd(n)
    const t = setInterval(() => { n--; setResendCd(n); if (n <= 0) clearInterval(t) }, 1000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouched(true)
    const err = validate(email)
    if (err) { setError(err); return }
    setLoading(true)
    try {
      const { data } = await authAPI.forgotPassword(email)
      if (data.userId) setUserId(data.userId)
      setSubmitted(true)
      startCooldown()
    } catch (err) {
      if (err.response?.status === 429) {
        toast.error('Too many requests. Please wait before trying again.')
      } else {
        // Always show success to prevent email enumeration
        setSubmitted(true)
        startCooldown()
      }
    } finally {
      setLoading(false) }
  }

  const resend = async () => {
    if (resendCd > 0) return
    try {
      await authAPI.forgotPassword(email)
      toast.success('Reset OTP sent again!')
      startCooldown()
    } catch { startCooldown() }
  }

  if (submitted) {
    return (
      <AuthLayout tag="EMAIL SENT" title="CHECK YOUR INBOX">
        <div className="card text-center space-y-5">
          <div className="text-5xl animate-float inline-block">📧</div>
          <p className="text-rb-muted text-sm leading-relaxed">
            If <span className="text-rb-fire font-semibold">{email}</span> is registered,
            a 6-digit OTP has been sent. It expires in <span className="text-rb-gold font-semibold">10 minutes</span>.
          </p>
          <Link to={`/reset-password?userId=${userId}&email=${encodeURIComponent(email)}`}
            className="btn-fire block">
            ENTER OTP ↗
          </Link>
          <div className="flex gap-3">
            <button onClick={resend} disabled={resendCd > 0} className="btn-ghost flex-1">
              {resendCd > 0 ? `RESEND IN ${resendCd}s` : '↺ RESEND OTP'}
            </button>
            <Link to="/login" className="btn-ghost flex-1">← LOGIN</Link>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout tag="ACCOUNT RECOVERY" title="FORGOT PASSWORD?" subtitle="Enter your email and we'll send a reset OTP.">
      <div className="card">
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <InputField
            label="YOUR EMAIL" name="email" type="email"
            value={email} onChange={e => { setEmail(e.target.value); if (touched) setError(validate(e.target.value)) }}
            onBlur={() => { setTouched(true); setError(validate(email)) }}
            error={touched ? error : null}
            valid={touched && !error && !!email}
            placeholder="you@email.com" autoComplete="email"
            helper="We'll send a 6-digit OTP to this address"
          />
          <div className="flex items-start gap-3 p-3 rounded-xl border border-rb-border bg-white/[.02]">
            <span>🔒</span>
            <p className="font-mono text-[10px] text-rb-muted leading-relaxed">
              For security, we don't confirm if an email is registered.
            </p>
          </div>
          <button type="submit" disabled={loading} className="btn-fire">
            {loading ? <><div className="spinner" />SENDING OTP...</> : 'SEND OTP ↗'}
          </button>
          <Link to="/login" className="btn-ghost block text-center">← BACK TO LOGIN</Link>
        </form>
      </div>
    </AuthLayout>
  )
}

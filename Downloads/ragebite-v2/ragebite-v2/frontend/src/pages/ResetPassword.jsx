import { useState, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import AuthLayout from '../components/auth/AuthLayout'
import InputField from '../components/auth/InputField'
import PasswordStrength from '../components/auth/PasswordStrength'
import { authAPI } from '../lib/api'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const userId = params.get('userId') || ''
  const email  = params.get('email')  || ''

  const [otp, setOtp]       = useState(['','','','','',''])
  const [otpErr, setOtpErr] = useState('')
  const [pw, setPw]         = useState('')
  const [cpw, setCpw]       = useState('')
  const [pwErr, setPwErr]   = useState('')
  const [cpwErr, setCpwErr] = useState('')
  const [loading, setLoading] = useState(false)
  const refs = [useRef(),useRef(),useRef(),useRef(),useRef(),useRef()]

  const onOtp = (i, val) => {
    const d = val.replace(/\D/,'').slice(-1)
    const next = [...otp]; next[i] = d; setOtp(next); setOtpErr('')
    if (d && i < 5) refs[i+1].current?.focus()
  }
  const onKey = (i, e) => { if (e.key === 'Backspace' && !otp[i] && i > 0) refs[i-1].current?.focus() }
  const onPaste = (e) => {
    const t = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6)
    if (t.length === 6) { setOtp(t.split('')); refs[5].current?.focus() }
    e.preventDefault()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) { setOtpErr('Enter the complete 6-digit OTP'); return }
    if (!pw) { setPwErr('Password is required'); return }
    if (pw.length < 8 || !/[A-Z]/.test(pw) || !/[a-z]/.test(pw) || !/[0-9]/.test(pw)) {
      setPwErr('Password must be 8+ chars with uppercase, lowercase, and number'); return
    }
    if (pw !== cpw) { setCpwErr('Passwords do not match'); return }

    setLoading(true)
    try {
      await authAPI.resetPassword({ userId, otp: code, password: pw, confirmPassword: cpw })
      toast.success('Password reset! Please log in.')
      navigate('/login?reset=success')
    } catch (err) {
      const d = err.response?.data
      if (d?.code === 'OTP_EXPIRED') setOtpErr('OTP expired. Request a new one.')
      else if (d?.code === 'MAX_ATTEMPTS') setOtpErr('Too many attempts. Request a new OTP.')
      else setOtpErr(d?.message || 'Invalid OTP.')
      setOtp(['','','','','','']); refs[0].current?.focus()
    } finally { setLoading(false) }
  }

  if (!userId) {
    return (
      <AuthLayout tag="ERROR" title="INVALID LINK">
        <div className="card text-center space-y-4">
          <p className="text-rb-muted text-sm">This reset link is invalid. Please request a new one.</p>
          <Link to="/forgot-password" className="btn-fire block">REQUEST NEW OTP ↗</Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout tag="RESET PASSWORD" title="NEW PASSWORD" subtitle={email ? `OTP sent to ${email}` : ''}>
      <div className="card">
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <label className="label">ENTER OTP</label>
            <div className="flex gap-2 justify-center" onPaste={onPaste}>
              {otp.map((d, i) => (
                <input key={i} ref={refs[i]} type="text" inputMode="numeric" maxLength={1} value={d}
                  onChange={e => onOtp(i, e.target.value)} onKeyDown={e => onKey(i, e)}
                  className={`w-11 h-13 text-center font-mono text-lg font-bold bg-[#0d0d0d] border rounded-xl outline-none transition-all text-rb-text
                    ${otpErr ? 'border-rb-fire' : d ? 'border-rb-plus' : 'border-rb-border focus:border-rb-fire'}`}
                  style={{ height: '52px' }}
                />
              ))}
            </div>
            {otpErr && <p className="err-msg text-center justify-center mt-1">⚠ {otpErr}</p>}
          </div>

          <div>
            <InputField label="NEW PASSWORD" name="pw" type="password" value={pw}
              onChange={e => { setPw(e.target.value); setPwErr('') }}
              error={pwErr} placeholder="Min 8 characters" autoComplete="new-password" />
            <PasswordStrength password={pw} />
          </div>

          <InputField label="CONFIRM PASSWORD" name="cpw" type="password" value={cpw}
            onChange={e => { setCpw(e.target.value); setCpwErr('') }}
            onBlur={() => { if (cpw && cpw !== pw) setCpwErr('Passwords do not match') }}
            error={cpwErr}
            valid={!!cpw && cpw === pw}
            placeholder="Repeat new password" autoComplete="new-password" />

          <button type="submit" disabled={loading} className="btn-fire">
            {loading ? <><div className="spinner" />RESETTING...</> : 'RESET PASSWORD ↗'}
          </button>
          <Link to="/forgot-password" className="btn-ghost block text-center">← REQUEST NEW OTP</Link>
        </form>
      </div>
    </AuthLayout>
  )
}

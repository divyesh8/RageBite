import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthLayout from '../components/auth/AuthLayout';
import InputField from '../components/auth/InputField';
import PasswordStrength from '../components/auth/PasswordStrength';
import { authAPI, setToken } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USER_RE  = /^[a-zA-Z0-9_]+$/;
const TAKEN_CODES = ['username_taken', 'email_taken'];

export default function RegisterPage() {
  const navigate  = useNavigate();
  const { setUser } = useAuth();

  // ─── STEP 1: REGISTER FORM ────────────────────────────────────────────────
  const [step, setStep]   = useState('form'); // form | otp | success
  const [loading, setLoading] = useState(false);
  const [userId, setUserId]   = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName]   = useState('');

  const [fields, setFields] = useState({ username:'', email:'', password:'', confirmPassword:'' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [usernameStatus, setUsernameStatus] = useState(null); // null | checking | available | taken
  const usernameTimer = useRef(null);

  const set = (name, val) => {
    setFields(f => {
      const next = { ...f, [name]: val };
      if (touched[name]) validate(name, val, next);
      if (name === 'password' && touched.confirmPassword) validate('confirmPassword', next.confirmPassword, next);
      return next;
    });
  };

  const validate = (name, val, all = fields) => {
    let err = null;
    if (name === 'username') {
      if (!val) err = 'Username is required';
      else if (val.length < 3) err = 'At least 3 characters';
      else if (val.length > 20) err = 'Max 20 characters';
      else if (!USER_RE.test(val)) err = 'Letters, numbers, underscores only';
      else if (usernameStatus === 'taken') err = 'Username already taken';
    }
    if (name === 'email') {
      if (!val) err = 'Email is required';
      else if (!EMAIL_RE.test(val)) err = 'Enter a valid email address';
    }
    if (name === 'password') {
      if (!val) err = 'Password is required';
      else if (val.length < 8) err = 'At least 8 characters';
      else if (!/[A-Z]/.test(val)) err = 'One uppercase letter required';
      else if (!/[a-z]/.test(val)) err = 'One lowercase letter required';
      else if (!/[0-9]/.test(val)) err = 'One number required';
    }
    if (name === 'confirmPassword') {
      if (!val) err = 'Please confirm your password';
      else if (val !== all.password) err = 'Passwords do not match';
    }
    setErrors(e => ({ ...e, [name]: err }));
    return !err;
  };

  const blur = (name) => {
    setTouched(t => ({ ...t, [name]: true }));
    validate(name, fields[name]);
  };

  const onUsernameInput = (val) => {
    set('username', val);
    setUsernameStatus(null);
    clearTimeout(usernameTimer.current);
    if (val.length >= 3 && USER_RE.test(val)) {
      setUsernameStatus('checking');
      usernameTimer.current = setTimeout(async () => {
        try {
          const { data } = await authAPI.checkUsername(val);
          setUsernameStatus(data.available ? 'available' : 'taken');
          if (!data.available) setErrors(e => ({ ...e, username: 'Username already taken' }));
          else setErrors(e => ({ ...e, username: null }));
        } catch { setUsernameStatus(null); }
      }, 600);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const allTouched = { username:true, email:true, password:true, confirmPassword:true };
    setTouched(allTouched);
    const ok = ['username','email','password','confirmPassword'].every(n => validate(n, fields[n]));
    if (!ok || usernameStatus === 'taken' || usernameStatus === 'checking') return;

    setLoading(true);
    try {
      const { data } = await authAPI.register(fields);
      setUserId(data.userId);
      setUserEmail(data.email);
      setUserName(fields.username);
      toast.success('OTP sent to your email!');
      setStep('otp');
    } catch (err) {
      const d = err.response?.data;
      if (d?.errors?.length) {
        const mapped = {};
        d.errors.forEach(e => { mapped[e.field] = e.message; });
        setErrors(prev => ({ ...prev, ...mapped }));
      } else {
        toast.error(d?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── OTP VERIFICATION ─────────────────────────────────────────────────────
  const [otp, setOtp]             = useState(['','','','','','']);
  const [otpError, setOtpError]   = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCd, setResendCd]   = useState(0);
  const otpRefs = [useRef(),useRef(),useRef(),useRef(),useRef(),useRef()];

  const onOtpChange = (i, val) => {
    const clean = val.replace(/\D/,'').slice(-1);
    const next = [...otp]; next[i] = clean;
    setOtp(next);
    setOtpError('');
    if (clean && i < 5) otpRefs[i+1].current?.focus();
  };
  const onOtpKey = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs[i-1].current?.focus();
  };
  const onOtpPaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
    if (text.length === 6) {
      setOtp(text.split(''));
      otpRefs[5].current?.focus();
    }
    e.preventDefault();
  };

  const startResend = () => {
    let n = 60;
    setResendCd(n);
    const t = setInterval(() => { n--; setResendCd(n); if (n <= 0) clearInterval(t); }, 1000);
  };

  const resendOTP = async () => {
    if (resendCd > 0) return;
    try {
      await authAPI.resendOTP({ userId });
      toast.success('New OTP sent!');
      startResend();
      setOtp(['','','','','','']);
      setOtpError('');
      otpRefs[0].current?.focus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP.');
    }
  };

  const submitOTP = async () => {
    const code = otp.join('');
    if (code.length < 6) { setOtpError('Please enter the complete 6-digit OTP.'); return; }
    setOtpLoading(true);
    setOtpError('');
    try {
      const { data } = await authAPI.verifyOTP({ userId, otp: code });
      if (data.accessToken) setToken(data.accessToken);
      setUser(data.user);
      toast.success('Email verified! Welcome to RageBite 🔥');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const d = err.response?.data;
      setOtpError(d?.message || 'Invalid OTP. Please try again.');
      setOtp(['','','','','','']);
      otpRefs[0].current?.focus();
    } finally {
      setOtpLoading(false);
    }
  };

  // ─── USERNAME STATUS ──────────────────────────────────────────────────────
  const UsernameStatus = () => {
    if (!fields.username || fields.username.length < 3) return null;
    if (usernameStatus === 'checking')  return <span className="font-mono text-[10px] text-rb-muted">···</span>;
    if (usernameStatus === 'available') return <span className="font-mono text-[10px] text-rb-plus">✓ FREE</span>;
    if (usernameStatus === 'taken')     return <span className="font-mono text-[10px] text-rb-fire">✗ TAKEN</span>;
    return null;
  };

  // ─── OTP SCREEN ───────────────────────────────────────────────────────────
  if (step === 'otp') {
    return (
      <AuthLayout tag="EMAIL VERIFICATION" title="CHECK YOUR EMAIL" subtitle={`We sent a 6-digit OTP to ${userEmail}`}>
        <div className="card space-y-6">
          <div className="text-center space-y-1">
            <div className="text-4xl animate-float inline-block">📧</div>
            <p className="font-mono text-[11px] text-rb-muted">OTP expires in 10 minutes · One time use</p>
          </div>

          {/* OTP input boxes */}
          <div className="flex gap-2 justify-center" onPaste={onOtpPaste}>
            {otp.map((d, i) => (
              <input
                key={i} ref={otpRefs[i]}
                type="text" inputMode="numeric" maxLength={1} value={d}
                onChange={e => onOtpChange(i, e.target.value)}
                onKeyDown={e => onOtpKey(i, e)}
                className={`w-12 h-14 text-center font-mono text-xl font-bold bg-[#0d0d0d] border rounded-xl outline-none transition-all text-rb-text ${
                  otpError ? 'border-rb-fire shadow-[0_0_0_3px_rgba(255,60,26,.12)]' : d ? 'border-rb-plus shadow-[0_0_0_3px_rgba(0,230,118,.08)]' : 'border-rb-border focus:border-rb-fire focus:shadow-[0_0_0_3px_rgba(255,60,26,.1)]'
                }`}
              />
            ))}
          </div>

          {otpError && <p className="err-msg text-center justify-center">⚠ {otpError}</p>}

          <button className="btn-fire" onClick={submitOTP} disabled={otpLoading || otp.join('').length < 6}>
            {otpLoading ? <><div className="spinner"/>VERIFYING...</> : 'VERIFY EMAIL ↗'}
          </button>

          <div className="flex items-center justify-between">
            <button onClick={resendOTP} disabled={resendCd > 0}
              className="font-mono text-[10px] text-rb-muted hover:text-rb-fire transition-colors disabled:opacity-40">
              {resendCd > 0 ? `RESEND IN ${resendCd}s` : '↺ RESEND OTP'}
            </button>
            <button onClick={() => setStep('form')}
              className="font-mono text-[10px] text-rb-muted hover:text-rb-text transition-colors">
              ← CHANGE EMAIL
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // ─── REGISTER FORM ────────────────────────────────────────────────────────
  return (
    <AuthLayout tag="JOIN THE ARENA" title="SIGN UP" subtitle="Create your account and start earning Aura.">
      <div className="card">
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <InputField
            label="USERNAME" name="username" value={fields.username}
            onChange={e => onUsernameInput(e.target.value)} onBlur={() => blur('username')}
            error={touched.username ? errors.username : null}
            valid={touched.username && !errors.username && usernameStatus === 'available'}
            placeholder="your_handle" autoComplete="username"
            helper="3–20 chars · letters, numbers, underscores"
            rightEl={<UsernameStatus />}
          />
          <InputField
            label="EMAIL" name="email" type="email" value={fields.email}
            onChange={e => set('email', e.target.value)} onBlur={() => blur('email')}
            error={touched.email ? errors.email : null}
            valid={touched.email && !errors.email && !!fields.email}
            placeholder="you@email.com" autoComplete="email"
          />
          <div>
            <InputField
              label="PASSWORD" name="password" type="password" value={fields.password}
              onChange={e => { set('password', e.target.value); }} onBlur={() => blur('password')}
              error={touched.password && errors.password ? errors.password : null}
              valid={touched.password && !errors.password && !!fields.password}
              placeholder="Min 8 characters" autoComplete="new-password"
            />
            <PasswordStrength password={fields.password} />
          </div>
          <InputField
            label="CONFIRM PASSWORD" name="confirmPassword" type="password" value={fields.confirmPassword}
            onChange={e => set('confirmPassword', e.target.value)} onBlur={() => blur('confirmPassword')}
            error={touched.confirmPassword ? errors.confirmPassword : null}
            valid={touched.confirmPassword && !errors.confirmPassword && fields.confirmPassword === fields.password && !!fields.confirmPassword}
            placeholder="Repeat your password" autoComplete="new-password"
          />

          <p className="font-mono text-[10px] text-rb-muted leading-relaxed pt-1">
            By signing up you agree to keep it friendly. Personal attacks = permanent Aura loss. 🔥
          </p>

          <button type="submit" disabled={loading || usernameStatus === 'checking'} className="btn-fire">
            {loading ? <><div className="spinner"/>CREATING ACCOUNT...</> : 'CREATE ACCOUNT ↗'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-rb-border" />
          <span className="font-mono text-[10px] text-rb-muted tracking-widest">OR</span>
          <div className="flex-1 h-px bg-rb-border" />
        </div>

        <p className="text-center font-mono text-[11px] text-rb-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-rb-fire underline underline-offset-2 hover:text-rb-text transition-colors">LOG IN</Link>
        </p>
      </div>

      <div className="flex items-center gap-3 px-4 py-3 mt-4 rounded-xl border border-rb-border bg-white/[.02]">
        <span className="text-xl">⚡</span>
        <p className="font-mono text-[10px] text-rb-muted leading-relaxed">
          Your <span className="text-rb-gold">Aura</span> starts at 0. Win battles to earn points. Lose and they get taken away.
        </p>
      </div>
    </AuthLayout>
  );
}

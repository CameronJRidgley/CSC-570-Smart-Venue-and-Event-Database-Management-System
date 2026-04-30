// Author: Nicco Hill
// LoginPage.jsx — Multi-step login flow supporting three account types.
//   Step 1: Choose Attendee, Vendor, or Staff.
//   Step 2 (Staff only): Choose sub-role — Admin, Organizer, or Security.
//   Step 3: Enter credentials (email + password for Attendee/Vendor; password-only for Staff).
// Tries the real API first; falls back to mock accounts when the backend is offline.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const STAFF_ROLES = [
  { id: 'admin',     label: 'Admin',     desc: 'Full system access',        color: '#dc2626', bg: '#fee2e2', email: 'admin@example.com',     password: 'admin123!' },
  { id: 'organizer', label: 'Organizer', desc: 'Manage and create events',  color: '#5b21b6', bg: '#ede9fe', email: 'organizer@example.com', password: 'organizer123!' },
  { id: 'security',  label: 'Security',  desc: 'Event check-in and access', color: '#065f46', bg: '#d1fae5', email: 'security@example.com',  password: 'security123!' },
]

const MOCK = {
  'attendee@example.com': { password: 'attendee123!', role: 'attendee' },
  'vendor@example.com':   { password: 'vendor123!',   role: 'vendor' },
}

function LoginPage() {
  const navigate = useNavigate()
  // step: 'pick-type' | 'attendee' | 'vendor' | 'pick-role' | 'staff-login'
  const [step, setStep]           = useState('pick-type')
  const [staffRole, setStaffRole] = useState(null)
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  function selectType(type) {
    setError(''); setPassword('')
    if (type === 'attendee') { setEmail('attendee@example.com'); setStep('attendee') }
    if (type === 'vendor')   { setEmail('vendor@example.com');   setStep('vendor') }
    if (type === 'staff')    { setStep('pick-role') }
  }

  function selectStaffRole(role) {
    setError(''); setPassword('')
    setStaffRole(role)
    setEmail(role.email)
    setStep('staff-login')
  }

  function goBack() {
    setError(''); setPassword('')
    if (step === 'attendee' || step === 'vendor' || step === 'pick-role') setStep('pick-type')
    if (step === 'staff-login') setStep('pick-role')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const role = step === 'attendee' ? 'attendee'
               : step === 'vendor'   ? 'vendor'
               : staffRole?.id

    try {
      const res = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data?.error?.message || 'Invalid password.'); return }
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      navigate('/dashboard')
    } catch {
      let valid = false
      if (step === 'attendee') valid = password === MOCK['attendee@example.com'].password
      if (step === 'vendor')   valid = password === MOCK['vendor@example.com'].password
      if (step === 'staff-login') valid = password === staffRole?.password

      if (valid) {
        localStorage.setItem('token', 'mock-token')
        localStorage.setItem('user', JSON.stringify({ email, role }))
        navigate('/dashboard')
      } else {
        setError('Incorrect password.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        <div style={styles.logoRow} onClick={() => navigate('/')}>
          <span style={styles.logoText}>Smart Events</span>
        </div>

        {/* ── Step 1: pick type ── */}
        {step === 'pick-type' && (
          <>
            <h2 style={styles.heading}>Sign in</h2>
            <p style={styles.sub}>Choose how you're accessing the system</p>
            <div style={styles.typeList}>
              <TypeCard icon="🎟" label="Attendee" desc="Browse and buy event tickets"   onClick={() => selectType('attendee')} />
              <TypeCard icon="🛒" label="Vendor"   desc="Manage your booth and listings" onClick={() => selectType('vendor')} />
              <TypeCard icon="🏢" label="Staff"    desc="Admin, Organizer, or Security"  onClick={() => selectType('staff')} highlight />
            </div>
          </>
        )}

        {/* ── Step 2 (Staff): pick sub-role ── */}
        {step === 'pick-role' && (
          <>
            <BackBtn onClick={goBack} />
            <h2 style={styles.heading}>Staff Login</h2>
            <p style={styles.sub}>Select your role to continue</p>
            <div style={styles.roleList}>
              {STAFF_ROLES.map((r, i) => (
                <button key={r.id} style={{ ...styles.roleBtn, borderColor: r.color }} onClick={() => selectStaffRole(r)}>
                  <div style={{ ...styles.roleRank, background: r.bg, color: r.color }}>{i + 1}</div>
                  <div style={styles.roleBtnInfo}>
                    <div style={{ ...styles.roleBtnLabel, color: r.color }}>{r.label}</div>
                    <div style={styles.roleBtnDesc}>{r.desc}</div>
                  </div>
                  <span style={styles.roleArrow}>›</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 3: password form (Attendee / Vendor / Staff) ── */}
        {(step === 'attendee' || step === 'vendor' || step === 'staff-login') && (
          <>
            <BackBtn onClick={goBack} />

            {step === 'staff-login' && staffRole && (
              <div style={{ ...styles.rolePill, background: staffRole.bg, color: staffRole.color }}>
                Staff — {staffRole.label}
              </div>
            )}

            <h2 style={styles.heading}>
              {step === 'attendee' ? 'Attendee Login'
               : step === 'vendor' ? 'Vendor Login'
               : `${staffRole?.label} Login`}
            </h2>
            <p style={styles.sub}>Enter your credentials to continue</p>

            {error && <div style={styles.errorBox}>{error}</div>}

            <form onSubmit={handleSubmit} style={styles.form}>
              {/* Attendee and Vendor need email; Staff role is already known */}
              {(step === 'attendee' || step === 'vendor') && (
                <div style={styles.field}>
                  <label style={styles.label}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    style={styles.input}
                  />
                </div>
              )}

              <div style={styles.field}>
                <label style={styles.label}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoFocus
                  style={styles.input}
                />
              </div>

              <button type="submit" style={loading ? styles.btnDisabled : styles.btn} disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <div style={styles.demoHint}>
              Demo password:&nbsp;
              <code style={styles.demoCode}>
                {step === 'attendee' ? 'attendee123!'
                 : step === 'vendor' ? 'vendor123!'
                 : staffRole?.password}
              </code>
            </div>
          </>
        )}

        <p style={styles.back}>
          <span style={styles.link} onClick={() => navigate('/')}>← Back to Welcome</span>
        </p>
      </div>
    </div>
  )
}

function TypeCard({ icon, label, desc, onClick, highlight }) {
  return (
    <button style={{ ...styles.typeCard, ...(highlight ? styles.typeCardHighlight : {}) }} onClick={onClick}>
      <span style={styles.typeIcon}>{icon}</span>
      <div>
        <div style={styles.typeLabel}>{label}</div>
        <div style={styles.typeDesc}>{desc}</div>
      </div>
    </button>
  )
}

function BackBtn({ onClick }) {
  return <button style={styles.backBtn} onClick={onClick}>‹ Back</button>
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #003366 0%, #004080 60%, #0066cc 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'sans-serif', padding: '20px',
  },
  card: {
    background: 'white', borderRadius: '16px', padding: '48px 40px',
    maxWidth: '440px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  logoRow:  { textAlign: 'center', marginBottom: '28px', cursor: 'pointer' },
  logoText: { fontSize: '22px', fontWeight: '700', color: '#004080', letterSpacing: '-0.5px' },
  heading:  { fontSize: '24px', fontWeight: '700', color: '#003366', margin: '0 0 6px', textAlign: 'center' },
  sub:      { fontSize: '14px', color: '#888', margin: '0 0 24px', textAlign: 'center' },

  typeList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  typeCard: {
    display: 'flex', alignItems: 'center', gap: '14px',
    padding: '16px 18px', border: '1px solid #e5e7eb', borderRadius: '10px',
    background: 'white', cursor: 'pointer', textAlign: 'left', width: '100%',
  },
  typeCardHighlight: { borderColor: '#004080', background: '#f0f5ff' },
  typeIcon:  { fontSize: '22px', flexShrink: 0 },
  typeLabel: { fontSize: '15px', fontWeight: '700', color: '#111', marginBottom: '2px' },
  typeDesc:  { fontSize: '13px', color: '#6b7280' },

  roleList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  roleBtn: {
    display: 'flex', alignItems: 'center', gap: '14px',
    padding: '14px 16px', border: '1px solid', borderRadius: '10px',
    background: 'white', cursor: 'pointer', textAlign: 'left', width: '100%',
  },
  roleRank: {
    width: '28px', height: '28px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '13px', fontWeight: '700', flexShrink: 0,
  },
  roleBtnInfo:  { flex: 1 },
  roleBtnLabel: { fontSize: '15px', fontWeight: '700', marginBottom: '2px' },
  roleBtnDesc:  { fontSize: '12px', color: '#6b7280' },
  roleArrow:    { fontSize: '20px', color: '#9ca3af' },

  rolePill: {
    display: 'inline-block', fontSize: '12px', fontWeight: '700',
    padding: '4px 12px', borderRadius: '20px', marginBottom: '12px',
  },

  form:    { display: 'flex', flexDirection: 'column', gap: '18px' },
  field:   { display: 'flex', flexDirection: 'column', gap: '6px' },
  label:   { fontSize: '14px', fontWeight: '600', color: '#333' },
  input:   { padding: '12px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '15px', outline: 'none' },
  btn:     { background: '#004080', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginTop: '4px' },
  btnDisabled: { background: '#aaa', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'not-allowed', marginTop: '4px' },
  errorBox: { background: '#fff0f0', border: '1px solid #ffcccc', color: '#cc0000', borderRadius: '8px', padding: '12px 16px', fontSize: '14px' },

  demoHint: { marginTop: '16px', padding: '10px 14px', background: '#f8f9ff', border: '1px solid #dde', borderRadius: '8px', fontSize: '13px', color: '#555', textAlign: 'center' },
  demoCode: { fontFamily: 'monospace', background: '#ececf8', padding: '2px 6px', borderRadius: '4px', fontSize: '13px' },

  backBtn: { background: 'none', border: 'none', color: '#004080', fontSize: '14px', fontWeight: '600', cursor: 'pointer', padding: '0 0 16px 0', display: 'block' },
  back:    { textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#888' },
  link:    { color: '#004080', cursor: 'pointer', fontWeight: '600' },
}

export default LoginPage

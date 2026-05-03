// Author: Nicco Hill, Cameron Ridgley
// Copilot had helped me work through bugs and things to sharp up this file
// RegisterPage.jsx — Account creation flow with three paths:
//   Attendee / Vendor → immediate access after registration.
//   Staff (Admin, Organizer, Security) → submitted for admin approval before login is granted.
// Validates all fields client-side, calls the API, and falls back to mock behavior offline.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

const STAFF_ROLES = [
  { id: 'admin',     label: 'Admin',     desc: 'Full system access',        color: '#dc2626', bg: '#fee2e2' },
  { id: 'organizer', label: 'Organizer', desc: 'Manage and create events',  color: '#5b21b6', bg: '#ede9fe' },
  { id: 'security',  label: 'Security',  desc: 'Event check-in and access', color: '#065f46', bg: '#d1fae5' },
]

const EMPTY = { firstName: '', lastName: '', email: '', password: '', confirm: '', business: '' }

function RegisterPage() {
  const navigate = useNavigate()
  const [accountType, setAccountType] = useState(null)      // 'attendee' | 'vendor' | 'staff'
  const [staffRole, setStaffRole]     = useState(null)       // admin | organizer | security
  const [form, setForm]               = useState(EMPTY)
  const [errors, setErrors]           = useState({})
  const [loading, setLoading]         = useState(false)
  const [submitted, setSubmitted]     = useState(false)      // staff pending screen

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setErrors(er => ({ ...er, [e.target.name]: '' }))
  }

  function selectType(type) {
    setAccountType(type)
    setStaffRole(null)
    setForm(EMPTY)
    setErrors({})
  }

  function goBack() {
    if (staffRole)      { setStaffRole(null); return }
    if (accountType)    { setAccountType(null); return }
  }

  function validate() {
    const e = {}
    if (!form.firstName.trim()) e.firstName = 'Required'
    if (!form.lastName.trim())  e.lastName  = 'Required'
    if (!form.email.trim())     e.email     = 'Required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.password)         e.password  = 'Required'
    else if (form.password.length < 8) e.password = 'Must be at least 8 characters'
    if (!form.confirm)          e.confirm   = 'Required'
    else if (form.confirm !== form.password) e.confirm = 'Passwords do not match'
    if (accountType === 'vendor' && !form.business.trim()) e.business = 'Required'
    return e
  }

  // Map UI role → backend UserRole enum value.
  // Backend valid roles: admin | organizer | staff | attendee | vendor
  // 'security' (UI staff sub-role) collapses to 'staff'.
  const role = accountType === 'staff'
    ? (staffRole?.id === 'security' ? 'staff' : staffRole?.id)
    : accountType

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)

    try {
      // 1. Create the user. Backend returns a UserRead — no token.
      await api.register({
        email:     form.email,
        password:  form.password,
        full_name: `${form.firstName} ${form.lastName}`.trim(),
        role,
      })

      if (accountType === 'staff') {
        // Staff accounts hold for admin approval — don't auto-login.
        setSubmitted(true)
        return
      }

      // 2. Immediately log them in so the dashboard has a valid token+user.
      const session = await api.login(form.email, form.password)
      localStorage.setItem('token', session.access_token)
      localStorage.setItem('user',  JSON.stringify(session.user))
      navigate('/dashboard')
    } catch (err) {
      // If backend reachable but rejected, show error; otherwise fall back to mock.
      if (err?.status && err.status !== 0) {
        setErrors({ email: err.message || 'Registration failed.' })
        setLoading(false)
        return
      }
      // Backend offline — mock
      if (accountType === 'staff') {
        setSubmitted(true)
      } else {
        localStorage.setItem('token', 'mock-token')
        localStorage.setItem('user', JSON.stringify({
          email: form.email,
          name: `${form.firstName} ${form.lastName}`,
          role,
          ...(accountType === 'vendor' ? { business: form.business } : {}),
        }))
        navigate('/dashboard')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Staff pending approval screen ────────────────────────
  if (submitted) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logoRow} onClick={() => navigate('/')}>
            <span style={styles.logoText}>Smart Events</span>
          </div>
          <div style={styles.pendingIcon}>⏳</div>
          <span style={styles.pendingBadge}>Pending Admin Approval</span>
          <h2 style={styles.heading}>Request Submitted</h2>
          <p style={styles.sub}>
            Your <strong>{staffRole?.label}</strong> account request has been sent to an administrator.
            You'll receive access once it's approved. Check back later or contact your event administrator.
          </p>
          <button style={styles.btn} onClick={() => navigate('/login')}>Back to Login</button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoRow} onClick={() => navigate('/')}>
          <span style={styles.logoText}>Smart Events</span>
        </div>

        {/* ── Step 1: pick account type ── */}
        {!accountType && (
          <>
            <h2 style={styles.heading}>Create an account</h2>
            <p style={styles.sub}>What type of account do you need?</p>
            <div style={styles.typeList}>
              <TypeCard icon="🎟" label="Attendee" desc="Browse and buy event tickets"    onClick={() => selectType('attendee')} color="#004080" />
              <TypeCard icon="🛒" label="Vendor"   desc="Manage your booth and listings"  onClick={() => selectType('vendor')}  color="#d97706" />
              <TypeCard icon="🏢" label="Staff"    desc="Requires admin approval"         onClick={() => selectType('staff')}   color="#374151" highlight />
            </div>
            <p style={styles.loginPrompt}>
              Already have an account?{' '}
              <span style={styles.link} onClick={() => navigate('/login')}>Sign in</span>
            </p>
          </>
        )}

        {/* ── Step 2 (Staff): pick sub-role ── */}
        {accountType === 'staff' && !staffRole && (
          <>
            <BackBtn onClick={goBack} />
            <h2 style={styles.heading}>Staff Account</h2>
            <p style={styles.sub}>Select your role — all staff accounts require admin approval</p>
            <div style={styles.roleList}>
              {STAFF_ROLES.map((r, i) => (
                <button key={r.id} style={{ ...styles.roleBtn, borderColor: r.color }} onClick={() => setStaffRole(r)}>
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

        {/* ── Registration form ── */}
        {(accountType === 'attendee' || accountType === 'vendor' || (accountType === 'staff' && staffRole)) && (
          <>
            <BackBtn onClick={goBack} />

            {accountType === 'staff' && staffRole && (
              <div style={{ ...styles.rolePill, background: staffRole.bg, color: staffRole.color }}>
                Staff — {staffRole.label}
              </div>
            )}

            <h2 style={styles.heading}>
              {accountType === 'attendee' ? 'Attendee Registration'
               : accountType === 'vendor' ? 'Vendor Registration'
               : `${staffRole?.label} Registration`}
            </h2>
            {accountType === 'staff' && (
              <div style={styles.approvalNote}>
                ⏳ Staff accounts are reviewed by an admin before activation.
              </div>
            )}

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.row}>
                <Field label="First Name" name="firstName" value={form.firstName} onChange={handleChange} placeholder="Jane"  error={errors.firstName} />
                <Field label="Last Name"  name="lastName"  value={form.lastName}  onChange={handleChange} placeholder="Smith" error={errors.lastName} />
              </div>

              {accountType === 'vendor' && (
                <Field label="Business Name" name="business" value={form.business} onChange={handleChange} placeholder="e.g. Artisan Coffee Co." error={errors.business} />
              )}

              <Field label="Email"    name="email"    type="email"    value={form.email}    onChange={handleChange} placeholder="you@example.com"   error={errors.email} />
              <Field label="Password" name="password" type="password" value={form.password} onChange={handleChange} placeholder="Min. 8 characters" error={errors.password} />
              <Field label="Confirm Password" name="confirm" type="password" value={form.confirm} onChange={handleChange} placeholder="Re-enter password" error={errors.confirm} />

              <button type="submit" style={loading ? styles.btnDisabled : styles.btn} disabled={loading}>
                {loading
                  ? 'Submitting…'
                  : accountType === 'staff'
                    ? 'Submit for Approval'
                    : 'Create Account'}
              </button>
            </form>

            <p style={styles.loginPrompt}>
              Already have an account?{' '}
              <span style={styles.link} onClick={() => navigate('/login')}>Sign in</span>
            </p>
          </>
        )}

        <p style={styles.back}>
          <span style={styles.link} onClick={() => navigate('/')}>← Back to Welcome</span>
        </p>
      </div>
    </div>
  )
}

function TypeCard({ icon, label, desc, onClick, color, highlight }) {
  return (
    <button
      style={{ ...styles.typeCard, ...(highlight ? { borderColor: '#d1d5db', background: '#f9fafb' } : {}) }}
      onClick={onClick}
    >
      <span style={styles.typeIcon}>{icon}</span>
      <div>
        <div style={{ ...styles.typeLabel, color }}>{label}</div>
        <div style={styles.typeDesc}>{desc}</div>
      </div>
    </button>
  )
}

function Field({ label, name, value, onChange, type = 'text', placeholder, error }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <input
        type={type} name={name} value={value}
        onChange={onChange} placeholder={placeholder}
        style={{ ...styles.input, ...(error ? styles.inputError : {}) }}
      />
      {error && <span style={styles.errMsg}>{error}</span>}
    </div>
  )
}

function BackBtn({ onClick }) {
  return <button style={styles.backBtn} onClick={onClick}>‹ Back</button>
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #003366 0%, #004080 60%, #0066cc 100%)',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    fontFamily: 'sans-serif', padding: '40px 20px',
  },
  card: {
    background: 'white', borderRadius: '16px', padding: '48px 40px',
    maxWidth: '460px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  logoRow:  { textAlign: 'center', marginBottom: '24px', cursor: 'pointer' },
  logoText: { fontSize: '22px', fontWeight: '700', color: '#004080', letterSpacing: '-0.5px' },
  heading:  { fontSize: '24px', fontWeight: '700', color: '#003366', margin: '0 0 6px', textAlign: 'center' },
  sub:      { fontSize: '14px', color: '#888', margin: '0 0 20px', textAlign: 'center' },

  typeList: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' },
  typeCard: { display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px', border: '1px solid #e5e7eb', borderRadius: '10px', background: 'white', cursor: 'pointer', textAlign: 'left', width: '100%' },
  typeIcon:  { fontSize: '22px', flexShrink: 0 },
  typeLabel: { fontSize: '15px', fontWeight: '700', marginBottom: '2px' },
  typeDesc:  { fontSize: '13px', color: '#6b7280' },

  roleList: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '4px' },
  roleBtn:  { display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', border: '1px solid', borderRadius: '10px', background: 'white', cursor: 'pointer', textAlign: 'left', width: '100%' },
  roleRank: { width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 },
  roleBtnInfo:  { flex: 1 },
  roleBtnLabel: { fontSize: '15px', fontWeight: '700', marginBottom: '2px' },
  roleBtnDesc:  { fontSize: '12px', color: '#6b7280' },
  roleArrow:    { fontSize: '20px', color: '#9ca3af' },

  rolePill: { display: 'inline-block', fontSize: '12px', fontWeight: '700', padding: '4px 12px', borderRadius: '20px', marginBottom: '12px' },
  approvalNote: { background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', fontWeight: '500', marginBottom: '16px', textAlign: 'center' },

  form:  { display: 'flex', flexDirection: 'column', gap: '14px' },
  row:   { display: 'flex', gap: '12px' },
  field: { display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 },
  label: { fontSize: '14px', fontWeight: '600', color: '#333' },
  input: { padding: '11px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '15px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  inputError: { borderColor: '#fca5a5' },
  errMsg: { fontSize: '12px', color: '#dc2626' },
  btn:        { background: '#004080', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginTop: '4px' },
  btnDisabled:{ background: '#aaa', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'not-allowed', marginTop: '4px' },

  pendingIcon:  { fontSize: '48px', textAlign: 'center', display: 'block', marginBottom: '12px' },
  pendingBadge: { display: 'block', textAlign: 'center', background: '#fef3c7', color: '#92400e', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '4px 14px', borderRadius: '20px', marginBottom: '16px', width: 'fit-content', margin: '0 auto 16px' },

  backBtn:     { background: 'none', border: 'none', color: '#004080', fontSize: '14px', fontWeight: '600', cursor: 'pointer', padding: '0 0 16px 0', display: 'block' },
  loginPrompt: { textAlign: 'center', marginTop: '16px', fontSize: '14px', color: '#555' },
  back:        { textAlign: 'center', marginTop: '16px', fontSize: '14px', color: '#888' },
  link:        { color: '#004080', cursor: 'pointer', fontWeight: '600' },
}

export default RegisterPage

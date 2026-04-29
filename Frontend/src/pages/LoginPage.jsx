import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const mockAccounts = {
    'attendee@example.com':  { password: 'attendee123!',  role: 'attendee' },
    'organizer@example.com': { password: 'organizer123!', role: 'organizer' },
    'staff@example.com':     { password: 'staff123!',     role: 'staff' },
    'admin@example.com':     { password: 'admin1234!',    role: 'admin' },
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data?.error?.message || 'Invalid email or password.')
        return
      }

      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      navigate('/dashboard')
    } catch {
      // Backend offline — fall back to mock accounts
      const account = mockAccounts[email]
      if (account && account.password === password) {
        localStorage.setItem('token', 'mock-token')
        localStorage.setItem('user', JSON.stringify({ email, role: account.role }))
        navigate('/dashboard')
      } else {
        setError('Invalid email or password.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoRow} onClick={() => navigate('/')} title="Back to home">
          <span style={styles.logoText}>Smart Events</span>
        </div>

        <h2 style={styles.heading}>Sign in to your account</h2>
        <p style={styles.sub}>Enter your credentials to continue</p>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
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

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={styles.input}
            />
          </div>

          <button type="submit" style={loading ? styles.btnDisabled : styles.btn} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div style={styles.hint}>
          <strong>Demo accounts:</strong><br />
          attendee@example.com / attendee123!<br />
          organizer@example.com / organizer123!<br />
          staff@example.com / staff123!
        </div>

        <p style={styles.back}>
          <span style={styles.link} onClick={() => navigate('/')}>← Back to Welcome</span>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #003366 0%, #004080 60%, #0066cc 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'sans-serif',
    padding: '20px',
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '48px 40px',
    maxWidth: '420px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  logoRow: {
    textAlign: 'center',
    marginBottom: '28px',
    cursor: 'pointer',
  },
  logoText: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#004080',
    letterSpacing: '-0.5px',
  },
  heading: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#003366',
    margin: '0 0 6px',
    textAlign: 'center',
  },
  sub: {
    fontSize: '14px',
    color: '#888',
    margin: '0 0 28px',
    textAlign: 'center',
  },
  errorBox: {
    background: '#fff0f0',
    border: '1px solid #ffcccc',
    color: '#cc0000',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '14px',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
  },
  input: {
    padding: '12px 14px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  btn: {
    background: '#004080',
    color: 'white',
    border: 'none',
    padding: '14px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '4px',
  },
  btnDisabled: {
    background: '#aaa',
    color: 'white',
    border: 'none',
    padding: '14px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'not-allowed',
    marginTop: '4px',
  },
  hint: {
    marginTop: '24px',
    background: '#f8f9ff',
    border: '1px solid #dde',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '13px',
    color: '#555',
    lineHeight: '1.8',
    textAlign: 'center',
  },
  back: {
    textAlign: 'center',
    marginTop: '20px',
    fontSize: '14px',
    color: '#888',
  },
  link: {
    color: '#004080',
    cursor: 'pointer',
    fontWeight: '600',
  },
}

export default LoginPage

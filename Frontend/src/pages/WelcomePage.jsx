// Author: Nicco Hill
// WelcomePage.jsx — Landing page shown to unauthenticated visitors.
// Provides entry points to Log In and Create Account, and displays
// the five supported user roles as informational tags.

import { useNavigate } from 'react-router-dom'

function WelcomePage() {
  const navigate = useNavigate()

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.badge}>Smart Venue & Event Management</div>
        <h1 style={styles.title}>Welcome to<br />Smart Events</h1>
        <p style={styles.subtitle}>
          Browse events, purchase tickets, and manage your experience — all in one place.
        </p>
        <div style={styles.buttonRow}>
          <button style={styles.primaryBtn} onClick={() => navigate('/login')}>
            Log In
          </button>
          <button style={styles.secondaryBtn} onClick={() => navigate('/register')}>
            Create Account
          </button>
        </div>
        <div style={styles.roles}>
          <span style={styles.roleTag}>Attendee</span>
          <span style={styles.roleTag}>Vendor</span>
          <span style={{ ...styles.roleTag, ...styles.roleTagAdmin }}>Admin</span>
          <span style={styles.roleTag}>Organizer</span>
          <span style={styles.roleTag}>Security</span>
        </div>

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
    padding: '56px 48px',
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  badge: {
    display: 'inline-block',
    background: '#e8f0fe',
    color: '#004080',
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    padding: '6px 14px',
    borderRadius: '20px',
    marginBottom: '24px',
  },
  title: {
    fontSize: '42px',
    fontWeight: '700',
    color: '#003366',
    margin: '0 0 16px',
    lineHeight: '1.2',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    lineHeight: '1.6',
    margin: '0 0 36px',
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginBottom: '32px',
  },
  primaryBtn: {
    background: '#004080',
    color: 'white',
    border: 'none',
    padding: '14px 32px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    flex: 1,
  },
  secondaryBtn: {
    background: 'white',
    color: '#004080',
    border: '2px solid #004080',
    padding: '14px 32px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    flex: 1,
  },
  roles: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  roleTag: {
    background: '#f4f4f4',
    color: '#555',
    fontSize: '13px',
    padding: '4px 12px',
    borderRadius: '20px',
  },
  roleTagAdmin: {
    background: '#fee2e2',
    color: '#991b1b',
  },
  vendorCta: {
    marginTop: '20px',
    fontSize: '13px',
    color: '#888',
  },
  vendorLink: {
    color: '#004080',
    fontWeight: '600',
    cursor: 'pointer',
  },
}

export default WelcomePage

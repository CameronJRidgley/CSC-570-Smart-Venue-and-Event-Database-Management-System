import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UpcomingEvents from '../components/UpcomingEvents'
import MyTickets from '../components/MyTickets'

const TABS = [
  { id: 'events',  label: 'Upcoming Events' },
  { id: 'tickets', label: 'My Tickets' },
]

function DashboardPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('events')
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/')
  }

  return (
    <div style={styles.page}>
      {/* Top bar */}
      <header style={styles.header}>
        <span style={styles.logo}>Smart Events</span>
        <div style={styles.userRow}>
          {user.email && (
            <span style={styles.userEmail}>{user.email}</span>
          )}
          <button style={styles.logoutBtn} onClick={handleLogout}>Log Out</button>
        </div>
      </header>

      {/* Tab nav */}
      <nav style={styles.nav}>
        <div style={styles.tabList}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              style={activeTab === tab.id ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main style={styles.main}>
        {activeTab === 'events'  && <UpcomingEvents />}
        {activeTab === 'tickets' && <MyTickets />}
      </main>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f5f7fa',
    fontFamily: 'sans-serif',
  },
  header: {
    background: '#003366',
    color: 'white',
    padding: '0 32px',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    fontSize: '20px',
    fontWeight: '700',
    letterSpacing: '-0.5px',
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  userEmail: {
    fontSize: '14px',
    color: '#a8c4e0',
  },
  logoutBtn: {
    background: 'rgba(255,255,255,0.12)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.25)',
    padding: '6px 16px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  nav: {
    background: 'white',
    borderBottom: '1px solid #e5e7eb',
    padding: '0 32px',
  },
  tabList: {
    display: 'flex',
    gap: '4px',
  },
  tab: {
    background: 'none',
    border: 'none',
    borderBottom: '3px solid transparent',
    padding: '16px 20px',
    fontSize: '15px',
    fontWeight: '500',
    color: '#6b7280',
    cursor: 'pointer',
    marginBottom: '-1px',
  },
  tabActive: {
    background: 'none',
    border: 'none',
    borderBottom: '3px solid #004080',
    padding: '16px 20px',
    fontSize: '15px',
    fontWeight: '600',
    color: '#004080',
    cursor: 'pointer',
    marginBottom: '-1px',
  },
  main: {
    maxWidth: '860px',
    margin: '0 auto',
    padding: '32px 24px',
  },
}

export default DashboardPage

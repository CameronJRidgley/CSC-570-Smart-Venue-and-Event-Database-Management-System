// Author: Nicco Hill, Cameron Ridgley
// Copilot had helped me work through bugs and things to sharp up this file
// DashboardPage.jsx — Role-based dashboard shell shown after login.
// Reads the user's role from localStorage and renders the appropriate
// tab set. Each tab swaps in a different feature component as the main content.
// Supported roles: attendee, vendor, admin, organizer, security.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UpcomingEvents from '../components/UpcomingEvents'
import MyTickets from '../components/MyTickets'
import VendorDashboard from '../components/VendorDashboard'
import VendorApply from '../components/VendorApply'
import OrganizerEvents from '../components/OrganizerEvents'
import CreateEvent from '../components/CreateEvent'
import StaffCheckIn from '../components/StaffCheckIn'
import CrowdMonitor from '../components/CrowdMonitor'
import PersonnelAssignment from '../components/PersonnelAssignment'
import AdminUsers from '../components/AdminUsers'
import AdminReports from '../components/AdminReports'
import AdminApprovals from '../components/AdminApprovals'
import EventFeedback from '../components/EventFeedback'
import IncidentReport from '../components/IncidentReport'

const ROLE_TABS = {
  attendee: [
    { id: 'events',  label: 'Upcoming Events', component: UpcomingEvents },
    { id: 'tickets', label: 'My Tickets',       component: MyTickets },
    { id: 'feedback',label: 'Feedback',         component: EventFeedback },
  ],
  vendor: [
    { id: 'vendor', label: 'My Dashboard',  component: VendorDashboard },
    { id: 'apply',  label: 'Apply for Event', component: VendorApply },
  ],
  admin: [
    { id: 'approvals',  label: 'Approvals',      component: AdminApprovals },
    { id: 'users',      label: 'Manage Users',   component: AdminUsers },
    { id: 'reports',    label: 'Reports',        component: AdminReports },
    { id: 'events',     label: 'All Events',     component: OrganizerEvents },
    { id: 'crowd',      label: 'Crowd Monitor',  component: CrowdMonitor },
    { id: 'incidents',  label: 'Incidents',      component: IncidentReport },
    { id: 'personnel',  label: 'Personnel',      component: PersonnelAssignment },
  ],
  organizer: [
    { id: 'my-events',    label: 'My Events',    component: OrganizerEvents },
    { id: 'create-event', label: 'Create Event', component: CreateEvent },
    { id: 'incidents',    label: 'Incidents',    component: IncidentReport },
  ],
  security: [
    { id: 'checkin',   label: 'Check-In',   component: StaffCheckIn },
    { id: 'crowd',     label: 'Crowd Monitor', component: CrowdMonitor },
    { id: 'incidents', label: 'File Incident', component: IncidentReport },
    { id: 'personnel', label: 'Personnel',  component: PersonnelAssignment },
  ],
  // Backend stores generic staff users with role='staff' (UserRole.STAFF).
  // They get the same dashboard as a security officer.
  staff: [
    { id: 'checkin',   label: 'Check-In',      component: StaffCheckIn },
    { id: 'crowd',     label: 'Crowd Monitor', component: CrowdMonitor },
    { id: 'incidents', label: 'File Incident', component: IncidentReport },
    { id: 'personnel', label: 'Personnel',     component: PersonnelAssignment },
  ],
}

const ROLE_COLORS = {
  attendee:  { bg: '#dbeafe', text: '#1e40af' },
  vendor:    { bg: '#fef3c7', text: '#92400e' },
  admin:     { bg: '#fee2e2', text: '#991b1b' },
  organizer: { bg: '#ede9fe', text: '#5b21b6' },
  security:  { bg: '#d1fae5', text: '#065f46' },
  staff:     { bg: '#d1fae5', text: '#065f46' },
}

const ROLE_LABELS = {
  attendee:  'Attendee',
  vendor:    'Vendor',
  admin:     'Admin',
  organizer: 'Organizer',
  security:  'Security',
  staff:     'Staff',
}

function DashboardPage() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const role = user.role || 'attendee'
  const tabs = ROLE_TABS[role] || ROLE_TABS.attendee
  const [activeTab, setActiveTab] = useState(tabs[0].id)

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/')
  }

  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || (() => null)
  const roleColor = ROLE_COLORS[role] || ROLE_COLORS.attendee
  const roleLabel = ROLE_LABELS[role] || role

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <span style={styles.logo}>Smart Events</span>
        <div style={styles.userRow}>
          {user.email && <span style={styles.userEmail}>{user.email}</span>}
          <span style={{ ...styles.roleBadge, background: roleColor.bg, color: roleColor.text }}>
            {roleLabel}
          </span>
          <button style={styles.logoutBtn} onClick={handleLogout}>Log Out</button>
        </div>
      </header>

      <nav style={styles.nav}>
        <div style={styles.tabList}>
          {tabs.map(tab => (
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

      <main style={styles.main}>
        <ActiveComponent />
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
    gap: '12px',
  },
  userEmail: {
    fontSize: '14px',
    color: '#a8c4e0',
  },
  roleBadge: {
    fontSize: '12px',
    fontWeight: '700',
    padding: '4px 12px',
    borderRadius: '20px',
    letterSpacing: '0.3px',
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
    maxWidth: '960px',
    margin: '0 auto',
    padding: '32px 24px',
  },
}

export default DashboardPage

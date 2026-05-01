// Author: Nicco Hill
// AdminUsers.jsx — User management panel for admins.
// Lists all registered users from /api/admin/users with their role,
// status, and join date. Supports live search by email and filtering
// by role. Admins can suspend/reactivate any account; the change is
// PATCHed to the backend so it persists.

import { useState, useEffect } from 'react'
import { api } from '../api'

const ROLE_COLORS = {
  attendee:  { bg: '#dbeafe', text: '#1e40af' },
  organizer: { bg: '#ede9fe', text: '#5b21b6' },
  staff:     { bg: '#d1fae5', text: '#065f46' },
  admin:     { bg: '#fee2e2', text: '#991b1b' },
  vendor:    { bg: '#ffedd5', text: '#9a3412' },
}

function AdminUsers() {
  const [users, setUsers]         = useState([])
  const [search, setSearch]       = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  useEffect(() => {
    setLoading(true)
    api.listAdminUsers()
      .then(setUsers)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const visible = users.filter(u => {
    const matchSearch = u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = filterRole === 'all' || u.role === filterRole
    return matchSearch && matchRole
  })

  async function toggleStatus(id) {
    const target = users.find(u => u.id === id)
    if (!target) return
    const next = !target.is_active
    // optimistic
    setUsers(us => us.map(u => u.id === id ? { ...u, is_active: next } : u))
    try {
      await api.updateAdminUser(id, { is_active: next })
    } catch (err) {
      // rollback
      setUsers(us => us.map(u => u.id === id ? { ...u, is_active: !next } : u))
      alert('Failed to update user: ' + err.message)
    }
  }

  return (
    <div>
      <div style={styles.topRow}>
        <h2 style={styles.heading}>Manage Users {loading && <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 400 }}>· loading…</span>}</h2>
        <span style={styles.count}>{users.length} total users</span>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      <div style={styles.filters}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by email…"
          style={styles.search}
        />
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={styles.select}>
          <option value="all">All Roles</option>
          <option value="attendee">Attendee</option>
          <option value="organizer">Organizer</option>
          <option value="staff">Staff</option>
          <option value="vendor">Vendor</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Joined</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(u => {
              const rc = ROLE_COLORS[u.role] || { bg: '#f3f4f6', text: '#374151' }
              const isActive = u.is_active !== false
              return (
                <tr key={u.id} style={styles.tr}>
                  <td style={styles.td}>{u.email}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, background: rc.bg, color: rc.text }}>
                      {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, ...(isActive ? styles.activeStatus : styles.suspendedStatus) }}>
                      {isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td style={{ ...styles.td, color: '#6b7280', fontSize: '13px' }}>{(u.created_at || '').slice(0, 10)}</td>
                  <td style={styles.td}>
                    <button
                      style={isActive ? styles.suspendBtn : styles.activateBtn}
                      onClick={() => toggleStatus(u.id)}
                    >
                      {isActive ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!loading && visible.length === 0 && <div style={styles.empty}>No users match your filters.</div>}
      </div>
    </div>
  )
}

const styles = {
  topRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
  heading: { fontSize: '22px', fontWeight: '700', color: '#003366', margin: 0 },
  count: { fontSize: '14px', color: '#6b7280', background: '#f3f4f6', padding: '4px 12px', borderRadius: '20px' },
  filters: { display: 'flex', gap: '12px', marginBottom: '16px' },
  search: { flex: 1, padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none' },
  select: { padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', background: 'white' },
  tableWrapper: { background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#f9fafb' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e5e7eb' },
  tr: { borderBottom: '1px solid #f3f4f6' },
  td: { padding: '14px 16px', fontSize: '14px', color: '#111' },
  badge: { fontSize: '12px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px' },
  activeStatus: { background: '#d1fae5', color: '#065f46' },
  suspendedStatus: { background: '#fee2e2', color: '#991b1b' },
  suspendBtn: { background: 'none', border: '1px solid #fca5a5', color: '#dc2626', padding: '5px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' },
  activateBtn: { background: 'none', border: '1px solid #6ee7b7', color: '#065f46', padding: '5px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' },
  empty: { padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' },
}

export default AdminUsers

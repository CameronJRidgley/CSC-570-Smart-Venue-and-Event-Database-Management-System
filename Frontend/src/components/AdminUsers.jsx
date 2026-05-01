// Author: Nicco Hill
// AdminUsers.jsx — User management panel for admins.
// Lists all registered users with their role, status, and join date.
// Supports live search by email and filtering by role.
// Admins can suspend or reactivate any account with a single click.

import { useState } from 'react'

const ROLE_COLORS = {
  attendee:  { bg: '#dbeafe', text: '#1e40af' },
  organizer: { bg: '#ede9fe', text: '#5b21b6' },
  staff:     { bg: '#d1fae5', text: '#065f46' },
  admin:     { bg: '#fee2e2', text: '#991b1b' },
}

const INITIAL_USERS = [
  { id: 1, email: 'attendee@example.com',  role: 'attendee',  status: 'Active',   joined: '2025-01-12' },
  { id: 2, email: 'organizer@example.com', role: 'organizer', status: 'Active',   joined: '2025-01-08' },
  { id: 3, email: 'staff@example.com',     role: 'staff',     status: 'Active',   joined: '2025-02-01' },
  { id: 4, email: 'admin@example.com',     role: 'admin',     status: 'Active',   joined: '2024-12-15' },
  { id: 5, email: 'jane.doe@gmail.com',    role: 'attendee',  status: 'Active',   joined: '2025-03-22' },
  { id: 6, email: 'bob.smith@yahoo.com',   role: 'attendee',  status: 'Suspended', joined: '2025-02-14' },
  { id: 7, email: 'carol.jones@mail.com',  role: 'organizer', status: 'Active',   joined: '2025-01-30' },
]

function AdminUsers() {
  const [users, setUsers] = useState(INITIAL_USERS)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('all')

  const visible = users.filter(u => {
    const matchSearch = u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = filterRole === 'all' || u.role === filterRole
    return matchSearch && matchRole
  })

  function toggleStatus(id) {
    setUsers(us => us.map(u => u.id === id
      ? { ...u, status: u.status === 'Active' ? 'Suspended' : 'Active' }
      : u
    ))
  }

  return (
    <div>
      <div style={styles.topRow}>
        <h2 style={styles.heading}>Manage Users</h2>
        <span style={styles.count}>{users.length} total users</span>
      </div>

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
              const rc = ROLE_COLORS[u.role]
              return (
                <tr key={u.id} style={styles.tr}>
                  <td style={styles.td}>{u.email}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, background: rc.bg, color: rc.text }}>
                      {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, ...(u.status === 'Active' ? styles.activeStatus : styles.suspendedStatus) }}>
                      {u.status}
                    </span>
                  </td>
                  <td style={{ ...styles.td, color: '#6b7280', fontSize: '13px' }}>{u.joined}</td>
                  <td style={styles.td}>
                    <button
                      style={u.status === 'Active' ? styles.suspendBtn : styles.activateBtn}
                      onClick={() => toggleStatus(u.id)}
                    >
                      {u.status === 'Active' ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {visible.length === 0 && <div style={styles.empty}>No users match your filters.</div>}
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

// Author: Nicco Hill
// AdminReports.jsx — Platform-wide analytics overview for admins.
// Displays four summary stat cards (users, events, tickets sold, revenue)
// and a ranked table of top events by revenue with a mini capacity progress bar per row.

const stats = [
  { label: 'Total Users',    value: '1,234', delta: '+48 this month',  color: '#004080', bg: '#dbeafe' },
  { label: 'Total Events',   value: '48',    delta: '+5 this month',   color: '#5b21b6', bg: '#ede9fe' },
  { label: 'Tickets Sold',   value: '8,920', delta: '+620 this month', color: '#065f46', bg: '#d1fae5' },
  { label: 'Total Revenue',  value: '$312,450', delta: '+$18,200 this month', color: '#92400e', bg: '#fef3c7' },
]

const topEvents = [
  { name: 'Spring Music Festival', organizer: 'organizer@example.com', date: '2025-05-10', sold: 342, capacity: 500, revenue: '$15,390' },
  { name: 'Tech Summit 2025',      organizer: 'carol.jones@mail.com',  date: '2025-06-20', sold: 198, capacity: 200, revenue: '$29,700' },
  { name: 'Food & Wine Expo',      organizer: 'organizer@example.com', date: '2025-07-15', sold: 89,  capacity: 300, revenue: '$3,115'  },
  { name: 'Summer Festival',       organizer: 'carol.jones@mail.com',  date: '2025-08-01', sold: 210, capacity: 600, revenue: '$6,300'  },
]

function AdminReports() {
  return (
    <div>
      <h2 style={styles.heading}>Reports & Overview</h2>

      <div style={styles.statsGrid}>
        {stats.map(s => (
          <div key={s.label} style={{ ...styles.statCard, borderTop: `4px solid ${s.color}` }}>
            <div style={styles.statLabel}>{s.label}</div>
            <div style={{ ...styles.statValue, color: s.color }}>{s.value}</div>
            <div style={styles.statDelta}>{s.delta}</div>
          </div>
        ))}
      </div>

      <h3 style={styles.subHeading}>Top Events by Revenue</h3>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              <th style={styles.th}>Event</th>
              <th style={styles.th}>Organizer</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Sold / Cap</th>
              <th style={styles.th}>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {topEvents.map((ev, i) => {
              const pct = Math.round((ev.sold / ev.capacity) * 100)
              return (
                <tr key={i} style={styles.tr}>
                  <td style={{ ...styles.td, fontWeight: '600' }}>{ev.name}</td>
                  <td style={{ ...styles.td, color: '#6b7280', fontSize: '13px' }}>{ev.organizer}</td>
                  <td style={{ ...styles.td, color: '#6b7280', fontSize: '13px' }}>{ev.date}</td>
                  <td style={styles.td}>
                    <div style={styles.barRow}>
                      <span style={styles.barText}>{ev.sold}/{ev.capacity}</span>
                      <div style={styles.barBg}>
                        <div style={{ ...styles.barFill, width: `${pct}%`, background: pct >= 90 ? '#f59e0b' : '#004080' }} />
                      </div>
                    </div>
                  </td>
                  <td style={{ ...styles.td, fontWeight: '700', color: '#065f46' }}>{ev.revenue}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const styles = {
  heading: { fontSize: '22px', fontWeight: '700', color: '#003366', margin: '0 0 20px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' },
  statCard: { background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  statLabel: { fontSize: '13px', color: '#6b7280', marginBottom: '8px', fontWeight: '500' },
  statValue: { fontSize: '28px', fontWeight: '800', marginBottom: '4px' },
  statDelta: { fontSize: '12px', color: '#9ca3af' },
  subHeading: { fontSize: '16px', fontWeight: '700', color: '#374151', margin: '0 0 12px' },
  tableWrapper: { background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#f9fafb' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e5e7eb' },
  tr: { borderBottom: '1px solid #f3f4f6' },
  td: { padding: '14px 16px', fontSize: '14px', color: '#111' },
  barRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  barText: { fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' },
  barBg: { width: '80px', height: '6px', background: '#e5e7eb', borderRadius: '99px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '99px' },
}

export default AdminReports

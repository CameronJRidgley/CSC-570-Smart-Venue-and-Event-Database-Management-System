// Author: Nicco Hill
// AdminReports.jsx — Platform-wide analytics overview for admins.
// Pulls live aggregates from /api/admin/stats and ranked events from
// /api/admin/top-events. All numbers reflect the actual SQL data.

import { useState, useEffect } from 'react'
import { api } from '../api'

const money = (n) => '$' + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })

function AdminReports() {
  const [stats, setStats]       = useState(null)
  const [topEvents, setTopEvents] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    Promise.all([
      api.adminStats().catch(err => { throw err }),
      api.adminTopEvents(10).catch(() => []),
    ]).then(([s, t]) => {
      setStats(s)
      setTopEvents(t || [])
    }).catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ padding: 20, color: '#6b7280' }}>Loading reports…</div>
  if (error)   return <div style={{ padding: 20, color: '#991b1b' }}>{error}</div>
  if (!stats)  return null

  const cards = [
    { label: 'Total Users',   value: stats.total_users.toLocaleString(),     delta: `+${stats.new_users_30d} this month`,    color: '#004080', bg: '#dbeafe' },
    { label: 'Total Events',  value: stats.total_events.toLocaleString(),    delta: `+${stats.new_events_30d} this month`,   color: '#5b21b6', bg: '#ede9fe' },
    { label: 'Tickets Sold',  value: stats.tickets_sold.toLocaleString(),    delta: `+${stats.tickets_sold_30d} this month`, color: '#065f46', bg: '#d1fae5' },
    { label: 'Total Revenue', value: money(stats.total_revenue),              delta: `+${money(stats.revenue_30d)} this month`,color: '#92400e', bg: '#fef3c7' },
  ]

  return (
    <div>
      <h2 style={styles.heading}>Reports & Overview</h2>

      <div style={styles.statsGrid}>
        {cards.map(s => (
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
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Sold / Cap</th>
              <th style={styles.th}>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {topEvents.length === 0 && (
              <tr><td style={{ ...styles.td, color: '#9ca3af' }} colSpan={4}>No event data yet.</td></tr>
            )}
            {topEvents.map(ev => {
              const cap = ev.capacity || 1
              const pct = Math.min(100, Math.round((ev.sold / cap) * 100))
              const date = (ev.starts_at || '').slice(0, 10)
              return (
                <tr key={ev.event_id} style={styles.tr}>
                  <td style={{ ...styles.td, fontWeight: '600' }}>{ev.name}</td>
                  <td style={{ ...styles.td, color: '#6b7280', fontSize: '13px' }}>{date}</td>
                  <td style={styles.td}>
                    <div style={styles.barRow}>
                      <span style={styles.barText}>{ev.sold}/{ev.capacity}</span>
                      <div style={styles.barBg}>
                        <div style={{ ...styles.barFill, width: `${pct}%`, background: pct >= 90 ? '#f59e0b' : '#004080' }} />
                      </div>
                    </div>
                  </td>
                  <td style={{ ...styles.td, fontWeight: '700', color: '#065f46' }}>{money(ev.revenue)}</td>
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

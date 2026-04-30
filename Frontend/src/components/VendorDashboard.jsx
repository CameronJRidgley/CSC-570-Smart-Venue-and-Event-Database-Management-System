// Author: Nicco Hill
// VendorDashboard.jsx — Main dashboard for logged-in vendors.
// Shows booth assignment info, summary stats (total sold, revenue, active listings),
// and a detailed listings table with per-item sales bars and status badges.

import { useState } from 'react'

const mockListings = [
  { id: 1, name: 'Artisan Coffee', category: 'Food & Beverage', price: 5.50,  sold: 142, stock: 200, event: 'Spring Fest',           status: 'Active' },
  { id: 2, name: 'Handmade Jewelry', category: 'Merchandise',   price: 25.00, sold: 34,  stock: 50,  event: 'Spring Fest',           status: 'Active' },
  { id: 3, name: 'Craft Beer Flight', category: 'Food & Beverage', price: 18.00, sold: 89, stock: 120, event: 'Summer Music Festival', status: 'Active' },
  { id: 4, name: 'Event T-Shirt', category: 'Merchandise',      price: 30.00, sold: 61,  stock: 100, event: 'Tech Innovators Conf.', status: 'Low Stock' },
]

const boothInfo = {
  location: 'Booth B-14',
  zone: 'Main Plaza — East Wing',
  event: 'Spring Fest',
  date: 'April 15, 2026',
}

const STATUS_COLORS = {
  'Active':     { bg: '#d1fae5', text: '#065f46' },
  'Low Stock':  { bg: '#fef3c7', text: '#92400e' },
  'Sold Out':   { bg: '#fee2e2', text: '#991b1b' },
}

function VendorDashboard() {
  const [listings] = useState(mockListings)

  const totalRevenue = listings.reduce((sum, l) => sum + l.sold * l.price, 0)
  const totalSold    = listings.reduce((sum, l) => sum + l.sold, 0)

  return (
    <div>
      <h2 style={styles.heading}>Vendor Dashboard</h2>

      {/* Booth info banner */}
      <div style={styles.boothCard}>
        <div>
          <div style={styles.boothTitle}>{boothInfo.location}</div>
          <div style={styles.boothMeta}>{boothInfo.zone} &nbsp;·&nbsp; {boothInfo.event} &nbsp;·&nbsp; {boothInfo.date}</div>
        </div>
        <span style={styles.activeBadge}>Active</span>
      </div>

      {/* Summary stats */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Items Sold</div>
          <div style={{ ...styles.statValue, color: '#004080' }}>{totalSold.toLocaleString()}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Revenue</div>
          <div style={{ ...styles.statValue, color: '#065f46' }}>${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Active Listings</div>
          <div style={{ ...styles.statValue, color: '#5b21b6' }}>{listings.length}</div>
        </div>
      </div>

      {/* Listings */}
      <h3 style={styles.subHeading}>My Listings</h3>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              <th style={styles.th}>Item</th>
              <th style={styles.th}>Category</th>
              <th style={styles.th}>Event</th>
              <th style={styles.th}>Price</th>
              <th style={styles.th}>Sold / Stock</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {listings.map(l => {
              const sc = STATUS_COLORS[l.status] || STATUS_COLORS['Active']
              const pct = Math.round((l.sold / l.stock) * 100)
              return (
                <tr key={l.id} style={styles.tr}>
                  <td style={{ ...styles.td, fontWeight: '600' }}>{l.name}</td>
                  <td style={{ ...styles.td, color: '#6b7280', fontSize: '13px' }}>{l.category}</td>
                  <td style={{ ...styles.td, color: '#6b7280', fontSize: '13px' }}>{l.event}</td>
                  <td style={styles.td}>${l.price.toFixed(2)}</td>
                  <td style={styles.td}>
                    <div style={styles.barRow}>
                      <span style={styles.barText}>{l.sold}/{l.stock}</span>
                      <div style={styles.barBg}>
                        <div style={{ ...styles.barFill, width: `${pct}%`, background: pct >= 90 ? '#f59e0b' : '#004080' }} />
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, background: sc.bg, color: sc.text }}>{l.status}</span>
                  </td>
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
  heading:    { fontSize: '22px', fontWeight: '700', color: '#003366', margin: '0 0 20px' },
  boothCard:  { background: 'white', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: '4px solid #d97706', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  boothTitle: { fontSize: '17px', fontWeight: '700', color: '#111', marginBottom: '4px' },
  boothMeta:  { fontSize: '13px', color: '#6b7280' },
  activeBadge:{ background: '#d1fae5', color: '#065f46', fontSize: '12px', fontWeight: '600', padding: '4px 12px', borderRadius: '20px' },
  statsRow:   { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' },
  statCard:   { background: 'white', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  statLabel:  { fontSize: '13px', color: '#6b7280', marginBottom: '6px', fontWeight: '500' },
  statValue:  { fontSize: '26px', fontWeight: '800' },
  subHeading: { fontSize: '16px', fontWeight: '700', color: '#374151', margin: '0 0 12px' },
  tableWrapper: { background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' },
  table:      { width: '100%', borderCollapse: 'collapse' },
  thead:      { background: '#f9fafb' },
  th:         { padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e5e7eb' },
  tr:         { borderBottom: '1px solid #f3f4f6' },
  td:         { padding: '14px 16px', fontSize: '14px', color: '#111' },
  badge:      { fontSize: '12px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px' },
  barRow:     { display: 'flex', alignItems: 'center', gap: '8px' },
  barText:    { fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' },
  barBg:      { width: '70px', height: '6px', background: '#e5e7eb', borderRadius: '99px', overflow: 'hidden' },
  barFill:    { height: '100%', borderRadius: '99px' },
}

export default VendorDashboard

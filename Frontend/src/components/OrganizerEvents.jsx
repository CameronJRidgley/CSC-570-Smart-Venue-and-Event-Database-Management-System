// Author: Nicco Hill, Cameron Ridgley
// Copilot had helped me work through bugs and things to sharp up this file
// OrganizerEvents.jsx — Event management dashboard for organizers.
// Lists all events with live stats (attendees, revenue, vendor count).
// Each event card has two expandable panels:
//   "View Attendees" — shows VIP vs General breakdown and a split capacity bar.
//   "Manage Vendors" — assign vendors from the available pool or remove existing ones.
// Events pending admin approval are flagged with a ⏳ badge.

import { useState, useEffect } from 'react'
import { api } from '../api'

const AVAILABLE_VENDORS = [
  { id: 1, name: 'Artisan Coffee Co.',  type: 'Food & Beverage' },
  { id: 2, name: 'Sound Merch Shop',    type: 'Merchandise' },
  { id: 3, name: 'Smoky BBQ Truck',     type: 'Food & Beverage' },
  { id: 4, name: 'Vista Photography',   type: 'Services' },
  { id: 5, name: 'DevGear Store',       type: 'Merchandise' },
  { id: 6, name: 'Craft Lemonade Co.',  type: 'Food & Beverage' },
  { id: 7, name: 'Handmade Goods',      type: 'Merchandise' },
  { id: 8, name: 'Photo Booth Pros',    type: 'Services' },
]

const INITIAL_EVENTS = [
  {
    id: 1,
    name: 'Spring Music Festival',
    date: '2026-05-10', time: '4:00 PM',
    venue: 'Riverside Park', city: 'Austin, TX',
    capacity: 500, sold: 342, price: 45,
    status: 'Approved',
    attendees: { vip: 80, general: 262 },
    vendorIds: [1, 2],
  },
  {
    id: 2,
    name: 'Tech Summit 2026',
    date: '2026-06-20', time: '9:00 AM',
    venue: 'Convention Center', city: 'Dallas, TX',
    capacity: 200, sold: 198, price: 150,
    status: 'Approved',
    attendees: { vip: 50, general: 148 },
    vendorIds: [5],
  },
  {
    id: 3,
    name: 'Food & Wine Expo',
    date: '2026-07-15', time: '12:00 PM',
    venue: 'Downtown Plaza', city: 'Houston, TX',
    capacity: 300, sold: 89, price: 35,
    status: 'Pending',
    attendees: { vip: 20, general: 69 },
    vendorIds: [3, 6],
  },
]

const STATUS_COLORS = {
  Approved: { bg: '#d1fae5', text: '#065f46' },
  Pending:  { bg: '#fef3c7', text: '#92400e' },
  Rejected: { bg: '#fee2e2', text: '#991b1b' },
}

const VENDOR_TYPE_COLORS = {
  'Food & Beverage': { bg: '#fef3c7', text: '#92400e' },
  'Merchandise':     { bg: '#e8f0fe', text: '#1a56db' },
  'Services':        { bg: '#ede9fe', text: '#5b21b6' },
}

function OrganizerEvents() {
  const [events, setEvents] = useState(INITIAL_EVENTS)
  const [openPanel, setOpenPanel] = useState({})   // { [eventId]: 'attendees' | 'vendors' | null }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([api.listEvents(), api.listVenues().catch(() => [])])
      .then(([rows, venues]) => {
        if (cancelled) return
        const venueMap = Object.fromEntries((venues || []).map(v => [v.id, v]))
        const adapted = (rows || []).map(e => {
          const v = venueMap[e.venue_id]
          const start = new Date(e.starts_at)
          const cap = e.capacity || 0
          const left = e.spots_left ?? cap
          const sold = Math.max(0, cap - left)
          // Rough VIP/general split — without a tier breakdown we estimate
          // 20% VIP for any event that has a price >= $75.
          const vipShare = (e.price || 0) >= 75 ? 0.2 : 0.05
          const vip = Math.round(sold * vipShare)
          return {
            id: e.id,
            name: e.name,
            date: start.toISOString().slice(0, 10),
            time: start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
            venue: v?.name || `Venue #${e.venue_id}`,
            city: v?.city || '',
            capacity: cap,
            sold,
            price: e.price || 0,
            status: (e.status || 'draft').charAt(0).toUpperCase() + (e.status || 'draft').slice(1),
            attendees: { vip, general: sold - vip },
            vendorIds: [],
          }
        })
        setEvents(adapted.length ? adapted : INITIAL_EVENTS)
        setError(null)
      })
      .catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  function togglePanel(id, panel) {
    setOpenPanel(p => ({ ...p, [id]: p[id] === panel ? null : panel }))
  }

  function assignVendor(eventId, vendorId) {
    setEvents(evs => evs.map(ev =>
      ev.id === eventId && !ev.vendorIds.includes(vendorId)
        ? { ...ev, vendorIds: [...ev.vendorIds, vendorId] }
        : ev
    ))
  }

  function removeVendor(eventId, vendorId) {
    setEvents(evs => evs.map(ev =>
      ev.id === eventId
        ? { ...ev, vendorIds: ev.vendorIds.filter(id => id !== vendorId) }
        : ev
    ))
  }

  return (
    <div>
      <div style={styles.topRow}>
        <h2 style={styles.heading}>My Events</h2>
        <span style={styles.count}>{events.length} events</span>
      </div>
      {loading && <p style={{ color: '#6b7280' }}>Loading events…</p>}
      {error && !loading && (
        <p style={{ color: '#92400e', background: '#fef3c7', padding: '8px 12px', borderRadius: 8 }}>
          Showing demo events — {error}
        </p>
      )}

      <div style={styles.list}>
        {events.map(ev => {
          const pct        = ev.capacity ? Math.round((ev.sold / ev.capacity) * 100) : 0
          const revenue    = (ev.sold * ev.price).toLocaleString()
          const sc         = STATUS_COLORS[ev.status] || STATUS_COLORS.Approved
          const panel      = openPanel[ev.id] || null
          const assigned   = AVAILABLE_VENDORS.filter(v => ev.vendorIds.includes(v.id))
          const unassigned = AVAILABLE_VENDORS.filter(v => !ev.vendorIds.includes(v.id))

          return (
            <div key={ev.id} style={styles.card}>
              {/* Header */}
              <div style={styles.cardTop}>
                <div>
                  <div style={styles.eventName}>{ev.name}</div>
                  <div style={styles.meta}>{ev.date} · {ev.time} · {ev.venue}, {ev.city}</div>
                </div>
                <span style={{ ...styles.statusBadge, background: sc.bg, color: sc.text }}>
                  {ev.status === 'Pending' ? '⏳ Pending Approval' : ev.status}
                </span>
              </div>

              {/* Stats */}
              <div style={styles.statsRow}>
                <div style={styles.stat}>
                  <div style={styles.statLabel}>Attendees</div>
                  <div style={styles.statValue}>{ev.sold.toLocaleString()} <span style={styles.statCap}>/ {ev.capacity}</span></div>
                </div>
                <div style={styles.stat}>
                  <div style={styles.statLabel}>Revenue</div>
                  <div style={styles.statValue}>${revenue}</div>
                </div>
                <div style={styles.stat}>
                  <div style={styles.statLabel}>Ticket Price</div>
                  <div style={styles.statValue}>${ev.price}</div>
                </div>
                <div style={styles.stat}>
                  <div style={styles.statLabel}>Vendors</div>
                  <div style={styles.statValue}>{assigned.length}</div>
                </div>
              </div>

              {/* Capacity bar */}
              <div style={styles.barBg}>
                <div style={{ ...styles.barFill, width: `${pct}%`, background: pct >= 90 ? '#f59e0b' : '#004080' }} />
              </div>
              <div style={styles.barLabel}>{pct}% sold</div>

              {/* Action buttons */}
              <div style={styles.actionRow}>
                <button
                  style={{ ...styles.actionBtn, ...(panel === 'attendees' ? styles.actionBtnActive : {}) }}
                  onClick={() => togglePanel(ev.id, 'attendees')}
                >
                  {panel === 'attendees' ? 'Hide Attendees ▲' : 'View Attendees ▼'}
                </button>
                <button
                  style={{ ...styles.actionBtn, ...(panel === 'vendors' ? styles.actionBtnActive : {}) }}
                  onClick={() => togglePanel(ev.id, 'vendors')}
                >
                  {panel === 'vendors' ? 'Hide Vendors ▲' : 'Manage Vendors ▼'}
                </button>
              </div>

              {/* Attendees panel */}
              {panel === 'attendees' && (
                <div style={styles.panel}>
                  <div style={styles.panelTitle}>Attendee Breakdown</div>
                  <div style={styles.attendeeGrid}>
                    <div style={styles.attendeeStat}>
                      <div style={styles.attendeeNum}>{ev.sold}</div>
                      <div style={styles.attendeeLabel}>Total Registered</div>
                    </div>
                    <div style={styles.attendeeStat}>
                      <div style={{ ...styles.attendeeNum, color: '#5b21b6' }}>{ev.attendees.vip}</div>
                      <div style={styles.attendeeLabel}>VIP</div>
                    </div>
                    <div style={styles.attendeeStat}>
                      <div style={{ ...styles.attendeeNum, color: '#004080' }}>{ev.attendees.general}</div>
                      <div style={styles.attendeeLabel}>General</div>
                    </div>
                    <div style={styles.attendeeStat}>
                      <div style={{ ...styles.attendeeNum, color: '#065f46' }}>{ev.capacity - ev.sold}</div>
                      <div style={styles.attendeeLabel}>Spots Left</div>
                    </div>
                  </div>
                  <div style={styles.attendeeBarWrap}>
                    <div style={styles.attendeeBarLabel}>
                      <span style={{ color: '#5b21b6', fontWeight: '600' }}>VIP</span>
                      <span style={{ color: '#004080', fontWeight: '600' }}>General</span>
                    </div>
                    <div style={styles.splitBar}>
                      <div style={{ width: `${Math.round((ev.attendees.vip / ev.capacity) * 100)}%`, background: '#5b21b6', height: '100%', borderRadius: '99px 0 0 99px' }} />
                      <div style={{ width: `${Math.round((ev.attendees.general / ev.capacity) * 100)}%`, background: '#004080', height: '100%' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Vendors panel */}
              {panel === 'vendors' && (
                <div style={styles.panel}>
                  <div style={styles.panelTitle}>
                    Assigned Vendors
                    <span style={styles.vendorCountBadge}>{assigned.length} assigned</span>
                  </div>

                  {assigned.length === 0 && (
                    <p style={styles.emptyNote}>No vendors assigned yet.</p>
                  )}

                  <div style={styles.vendorList}>
                    {assigned.map(v => {
                      const vc = VENDOR_TYPE_COLORS[v.type] || { bg: '#f3f4f6', text: '#374151' }
                      return (
                        <div key={v.id} style={styles.vendorRow}>
                          <div>
                            <div style={styles.vendorName}>{v.name}</div>
                            <span style={{ ...styles.vendorTypeBadge, background: vc.bg, color: vc.text }}>{v.type}</span>
                          </div>
                          <button style={styles.removeBtn} onClick={() => removeVendor(ev.id, v.id)}>Remove</button>
                        </div>
                      )
                    })}
                  </div>

                  {unassigned.length > 0 && (
                    <div style={styles.addVendorRow}>
                      <select
                        style={styles.vendorSelect}
                        defaultValue=""
                        onChange={e => {
                          if (e.target.value) { assignVendor(ev.id, Number(e.target.value)); e.target.value = '' }
                        }}
                      >
                        <option value="" disabled>+ Assign a vendor…</option>
                        {unassigned.map(v => (
                          <option key={v.id} value={v.id}>{v.name} — {v.type}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const styles = {
  topRow:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' },
  heading: { fontSize: '22px', fontWeight: '700', color: '#003366', margin: 0 },
  count:   { fontSize: '14px', color: '#6b7280', background: '#f3f4f6', padding: '4px 12px', borderRadius: '20px' },
  list:    { display: 'flex', flexDirection: 'column', gap: '16px' },

  card:      { background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: '4px solid #004080' },
  cardTop:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' },
  eventName: { fontSize: '18px', fontWeight: '700', color: '#111', marginBottom: '4px' },
  meta:      { fontSize: '13px', color: '#6b7280' },
  statusBadge: { fontSize: '12px', fontWeight: '600', padding: '4px 10px', borderRadius: '20px', whiteSpace: 'nowrap' },

  statsRow: { display: 'flex', gap: '24px', marginBottom: '14px', flexWrap: 'wrap' },
  stat:      { },
  statLabel: { fontSize: '12px', color: '#9ca3af', marginBottom: '2px' },
  statValue: { fontSize: '16px', fontWeight: '700', color: '#111' },
  statCap:   { fontSize: '13px', fontWeight: '400', color: '#9ca3af' },

  barBg:   { height: '6px', background: '#e5e7eb', borderRadius: '99px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '99px', transition: 'width 0.3s' },
  barLabel:{ fontSize: '12px', color: '#9ca3af', marginTop: '4px', marginBottom: '14px' },

  actionRow:       { display: 'flex', gap: '8px' },
  actionBtn:       { background: 'white', color: '#004080', border: '1px solid #004080', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  actionBtnActive: { background: '#004080', color: 'white' },

  panel:      { marginTop: '16px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' },
  panelTitle: { fontSize: '14px', fontWeight: '700', color: '#374151', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' },

  attendeeGrid:    { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '14px' },
  attendeeStat:    { background: '#f9fafb', borderRadius: '8px', padding: '12px', textAlign: 'center' },
  attendeeNum:     { fontSize: '22px', fontWeight: '800', color: '#111', marginBottom: '2px' },
  attendeeLabel:   { fontSize: '11px', color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase' },
  attendeeBarWrap: { },
  attendeeBarLabel:{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' },
  splitBar:        { display: 'flex', height: '8px', background: '#e5e7eb', borderRadius: '99px', overflow: 'hidden' },

  vendorCountBadge: { fontSize: '12px', background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: '20px', fontWeight: '600' },
  emptyNote:   { fontSize: '13px', color: '#9ca3af', margin: '0 0 12px' },
  vendorList:  { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' },
  vendorRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', borderRadius: '8px', padding: '10px 14px' },
  vendorName:  { fontSize: '14px', fontWeight: '600', color: '#111', marginBottom: '4px' },
  vendorTypeBadge: { fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' },
  removeBtn:   { background: 'none', border: '1px solid #fca5a5', color: '#dc2626', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '500', whiteSpace: 'nowrap' },
  addVendorRow:  { },
  vendorSelect:  { width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', background: 'white', cursor: 'pointer' },
}

export default OrganizerEvents

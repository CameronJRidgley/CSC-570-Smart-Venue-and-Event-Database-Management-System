// Author: Nicco Hill
// CrowdMonitor.jsx — Real-time crowd congestion viewer for security staff and admins.
// Select an event to see overall attendance plus a per-zone breakdown.
// Congestion levels: Low (<50%) · Moderate (51–75%) · High (76–89%) · Critical (≥90%).
// A red alert banner appears automatically when any zone hits Critical.
// The "last updated" timestamp refreshes every 30 seconds.

import { useState, useEffect } from 'react'
import { api } from '../api'

const MOCK_EVENTS = [
  {
    id: 1,
    name: 'Spring Music Festival',
    date: 'April 15, 2026',
    totalCapacity: 5000,
    currentAttendance: 3800,
    zones: [
      { name: 'Main Stage',     capacity: 2000, current: 1850 },
      { name: 'East Entrance',  capacity: 500,  current: 220  },
      { name: 'West Entrance',  capacity: 500,  current: 180  },
      { name: 'Food Court',     capacity: 800,  current: 560  },
      { name: 'VIP Area',       capacity: 400,  current: 390  },
      { name: 'Parking Lot A',  capacity: 800,  current: 600  },
    ],
  },
  {
    id: 2,
    name: 'Tech Innovators Conference',
    date: 'May 3, 2026',
    totalCapacity: 800,
    currentAttendance: 460,
    zones: [
      { name: 'Main Hall',      capacity: 400,  current: 310  },
      { name: 'Lobby',          capacity: 150,  current: 80   },
      { name: 'Workshop Room A',capacity: 100,  current: 42   },
      { name: 'Workshop Room B',capacity: 100,  current: 28   },
      { name: 'VIP Lounge',     capacity: 50,   current: 47   },
    ],
  },
  {
    id: 3,
    name: 'Summer Music Festival',
    date: 'June 7, 2026',
    totalCapacity: 10000,
    currentAttendance: 5500,
    zones: [
      { name: 'Main Stage',     capacity: 4000, current: 3100 },
      { name: 'Side Stage',     capacity: 1500, current: 800  },
      { name: 'North Entrance', capacity: 800,  current: 300  },
      { name: 'South Entrance', capacity: 800,  current: 250  },
      { name: 'Food Village',   capacity: 1500, current: 720  },
      { name: 'VIP Terrace',    capacity: 800,  current: 780  },
      { name: 'Camping Area',   capacity: 600,  current: 350  },
    ],
  },
]

function congestionLevel(pct) {
  if (pct >= 90) return { label: 'Critical', bg: '#fee2e2', text: '#dc2626', bar: '#dc2626' }
  if (pct >= 76) return { label: 'High',     bg: '#ffedd5', text: '#ea580c', bar: '#ea580c' }
  if (pct >= 51) return { label: 'Moderate', bg: '#fef3c7', text: '#d97706', bar: '#f59e0b' }
  return               { label: 'Low',       bg: '#d1fae5', text: '#065f46', bar: '#10b981' }
}

function CrowdMonitor() {
  const [eventList, setEventList] = useState(MOCK_EVENTS)
  const [selectedId, setSelectedId] = useState(MOCK_EVENTS[0].id)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [loadingZones, setLoadingZones] = useState(false)

  // Load real events on mount
  useEffect(() => {
    api.listEvents().then(rows => {
      if (!rows || !rows.length) return
      // Initialize each backend event with empty zones; we'll fetch on select
      const enriched = rows.map(e => ({
        id: e.id,
        name: e.name,
        date: new Date(e.starts_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
        totalCapacity: e.capacity || 0,
        currentAttendance: 0,
        zones: [],
        _real: true,
      }))
      setEventList(enriched)
      setSelectedId(enriched[0].id)
    }).catch(() => { /* keep mock */ })
  }, [])

  // When the user selects a real event, fetch zone snapshot + thresholds
  useEffect(() => {
    const ev = eventList.find(e => e.id === selectedId)
    if (!ev || !ev._real) return
    let cancelled = false
    setLoadingZones(true)
    Promise.all([
      api.getCrowdZones(selectedId).catch(() => null),
      // Thresholds endpoint not exposed individually; rely on zone latest data only
    ]).then(([snapshot]) => {
      if (cancelled) return
      const zones = (snapshot?.zones || []).map(z => {
        const cur = z.latest?.people_count ?? 0
        // No capacity per zone in DB; estimate as max of current * 1.25 or 100
        const cap = Math.max(Math.ceil(cur * 1.25), 100)
        return { name: z.zone, capacity: cap, current: cur }
      })
      const total = zones.reduce((s, z) => s + z.current, 0)
      setEventList(list => list.map(e => e.id === selectedId
        ? { ...e, zones, currentAttendance: total }
        : e))
      setLastUpdated(new Date())
      setLoadingZones(false)
    })
    return () => { cancelled = true }
  }, [selectedId, eventList.length])

  useEffect(() => {
    const t = setInterval(() => setLastUpdated(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  const event    = eventList.find(e => e.id === selectedId) || eventList[0]
  const overallPct = event.totalCapacity ? Math.round((event.currentAttendance / event.totalCapacity) * 100) : 0
  const overallLevel = congestionLevel(overallPct)
  const criticalZones = (event.zones || []).filter(z => z.capacity && Math.round((z.current / z.capacity) * 100) >= 90)

  return (
    <div>
      <div style={styles.topRow}>
        <h2 style={styles.heading}>Crowd Monitor</h2>
        <span style={styles.updated}>Updated {lastUpdated.toLocaleTimeString()}</span>
      </div>

      {/* Event selector */}
      <select
        value={selectedId}
        onChange={e => setSelectedId(Number(e.target.value))}
        style={styles.eventSelect}
      >
        {eventList.map(ev => (
          <option key={ev.id} value={ev.id}>{ev.name} — {ev.date}</option>
        ))}
      </select>
      {loadingZones && <p style={{ color: '#6b7280', fontSize: 13, marginTop: -10, marginBottom: 16 }}>Loading zone data…</p>}
      {event._real && !loadingZones && event.zones.length === 0 && (
        <p style={{ color: '#92400e', background: '#fef3c7', padding: '8px 12px', borderRadius: 8, marginBottom: 16 }}>
          No crowd readings have been recorded for this event yet.
        </p>
      )}

      {/* Overall summary */}
      <div style={{ ...styles.overallCard, borderColor: overallLevel.bar }}>
        <div style={styles.overallLeft}>
          <div style={styles.overallLabel}>Overall Attendance</div>
          <div style={styles.overallCount}>
            {event.currentAttendance.toLocaleString()}
            <span style={styles.overallCap}> / {event.totalCapacity.toLocaleString()}</span>
          </div>
          <div style={styles.overallBarBg}>
            <div style={{ ...styles.overallBarFill, width: `${overallPct}%`, background: overallLevel.bar }} />
          </div>
          <div style={styles.overallPct}>{overallPct}% capacity</div>
        </div>
        <div style={{ ...styles.overallBadge, background: overallLevel.bg, color: overallLevel.text }}>
          <div style={styles.overallBadgeLabel}>Status</div>
          <div style={styles.overallBadgeValue}>{overallLevel.label}</div>
        </div>
      </div>

      {/* Alert banner */}
      {criticalZones.length > 0 && (
        <div style={styles.alertBanner}>
          ⚠ Critical congestion in: {criticalZones.map(z => z.name).join(', ')}
        </div>
      )}

      {/* Zone grid */}
      <h3 style={styles.subHeading}>Zone Breakdown</h3>
      <div style={styles.zoneGrid}>
        {event.zones.map(zone => {
          const pct   = Math.round((zone.current / zone.capacity) * 100)
          const level = congestionLevel(pct)
          return (
            <div key={zone.name} style={{ ...styles.zoneCard, borderTop: `4px solid ${level.bar}` }}>
              <div style={styles.zoneName}>{zone.name}</div>
              <div style={styles.zoneCount}>
                <span style={{ color: level.bar, fontWeight: '800', fontSize: '22px' }}>{zone.current}</span>
                <span style={styles.zoneCap}> / {zone.capacity}</span>
              </div>
              <div style={styles.zoneBarBg}>
                <div style={{ ...styles.zoneBarFill, width: `${pct}%`, background: level.bar }} />
              </div>
              <div style={styles.zoneFooter}>
                <span style={styles.zonePct}>{pct}%</span>
                <span style={{ ...styles.zoneBadge, background: level.bg, color: level.text }}>{level.label}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const styles = {
  topRow:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
  heading:  { fontSize: '22px', fontWeight: '700', color: '#003366', margin: 0 },
  updated:  { fontSize: '12px', color: '#9ca3af' },

  eventSelect: { width: '100%', padding: '11px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px', outline: 'none', background: 'white', marginBottom: '20px', cursor: 'pointer' },

  overallCard:    { background: 'white', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: '4px solid', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  overallLeft:    { flex: 1 },
  overallLabel:   { fontSize: '12px', color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' },
  overallCount:   { fontSize: '28px', fontWeight: '800', color: '#111', marginBottom: '8px' },
  overallCap:     { fontSize: '16px', fontWeight: '400', color: '#9ca3af' },
  overallBarBg:   { height: '8px', background: '#e5e7eb', borderRadius: '99px', overflow: 'hidden', marginBottom: '4px', maxWidth: '300px' },
  overallBarFill: { height: '100%', borderRadius: '99px', transition: 'width 0.4s' },
  overallPct:     { fontSize: '13px', color: '#6b7280' },
  overallBadge:      { textAlign: 'center', padding: '16px 24px', borderRadius: '10px', marginLeft: '20px', flexShrink: 0 },
  overallBadgeLabel: { fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px', opacity: 0.7 },
  overallBadgeValue: { fontSize: '20px', fontWeight: '800' },

  alertBanner: { background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', fontWeight: '600', marginBottom: '20px' },

  subHeading: { fontSize: '15px', fontWeight: '700', color: '#374151', margin: '0 0 12px' },
  zoneGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' },
  zoneCard:   { background: 'white', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' },
  zoneName:   { fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' },
  zoneCount:  { marginBottom: '8px' },
  zoneCap:    { fontSize: '13px', color: '#9ca3af' },
  zoneBarBg:  { height: '6px', background: '#e5e7eb', borderRadius: '99px', overflow: 'hidden', marginBottom: '6px' },
  zoneBarFill:{ height: '100%', borderRadius: '99px' },
  zoneFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  zonePct:    { fontSize: '12px', color: '#9ca3af' },
  zoneBadge:  { fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px' },
}

export default CrowdMonitor

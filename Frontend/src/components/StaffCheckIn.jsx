// Author: Nicco Hill
// StaffCheckIn.jsx — Ticket check-in scanner for security personnel.
// Accepts a ticket ID input, validates it against known tickets, and marks
// it as checked in. Handles three states: success, already checked in, and invalid.
// Maintains a running log of all successful check-ins for the current session.

import { useState } from 'react'

const VALID_TICKETS = {
  'TK-001': { name: 'Alex Johnson',    event: 'Spring Music Festival', type: 'VIP',              checkedIn: false },
  'TK-002': { name: 'Maria Garcia',    event: 'Spring Music Festival', type: 'General Admission', checkedIn: false },
  'TK-003': { name: 'James Lee',       event: 'Tech Summit 2025',      type: 'General Admission', checkedIn: false },
  'TK-004': { name: 'Sarah Williams',  event: 'Spring Music Festival', type: 'VIP',              checkedIn: true  },
  'TK-005': { name: 'David Chen',      event: 'Food & Wine Expo',      type: 'General Admission', checkedIn: false },
}

function StaffCheckIn() {
  const [ticketId, setTicketId] = useState('')
  const [result, setResult] = useState(null)
  const [log, setLog] = useState([])
  const [tickets, setTickets] = useState(VALID_TICKETS)

  function handleCheckIn(e) {
    e.preventDefault()
    const id = ticketId.trim().toUpperCase()

    if (!tickets[id]) {
      setResult({ status: 'invalid', id })
      return
    }

    if (tickets[id].checkedIn) {
      setResult({ status: 'already', id, ...tickets[id] })
      return
    }

    const entry = { ...tickets[id], id, time: new Date().toLocaleTimeString() }
    setTickets(t => ({ ...t, [id]: { ...t[id], checkedIn: true } }))
    setResult({ status: 'success', ...entry })
    setLog(l => [entry, ...l])
    setTicketId('')
  }

  return (
    <div>
      <h2 style={styles.heading}>Check-In Scanner</h2>

      <div style={styles.card}>
        <p style={styles.hint}>Enter a ticket ID to check in an attendee. Try: TK-001, TK-002, TK-003, TK-005</p>

        <form onSubmit={handleCheckIn} style={styles.form}>
          <input
            value={ticketId}
            onChange={e => setTicketId(e.target.value)}
            placeholder="e.g. TK-001"
            style={styles.input}
            autoFocus
          />
          <button type="submit" style={styles.btn}>Check In</button>
        </form>

        {result && (
          <div style={{ ...styles.resultBox, ...STATUS_STYLE[result.status] }}>
            {result.status === 'success' && (
              <>
                <div style={styles.resultIcon}>✓</div>
                <div>
                  <div style={styles.resultTitle}>Checked In Successfully</div>
                  <div style={styles.resultSub}>{result.name} · {result.event} · {result.type}</div>
                </div>
              </>
            )}
            {result.status === 'already' && (
              <>
                <div style={styles.resultIcon}>!</div>
                <div>
                  <div style={styles.resultTitle}>Already Checked In</div>
                  <div style={styles.resultSub}>{result.name} · {result.event}</div>
                </div>
              </>
            )}
            {result.status === 'invalid' && (
              <>
                <div style={styles.resultIcon}>✗</div>
                <div>
                  <div style={styles.resultTitle}>Invalid Ticket ID</div>
                  <div style={styles.resultSub}>No ticket found for "{result.id}"</div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {log.length > 0 && (
        <div style={styles.logSection}>
          <h3 style={styles.logHeading}>Recent Check-Ins</h3>
          <div style={styles.logList}>
            {log.map((entry, i) => (
              <div key={i} style={styles.logEntry}>
                <div style={styles.logLeft}>
                  <div style={styles.logName}>{entry.name}</div>
                  <div style={styles.logMeta}>{entry.event} · {entry.type}</div>
                </div>
                <div style={styles.logRight}>
                  <span style={styles.logId}>{entry.id}</span>
                  <span style={styles.logTime}>{entry.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const STATUS_STYLE = {
  success: { background: '#d1fae5', border: '1px solid #6ee7b7', color: '#065f46' },
  already: { background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e' },
  invalid: { background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b' },
}

const styles = {
  heading: { fontSize: '22px', fontWeight: '700', color: '#003366', margin: '0 0 20px' },
  card: { background: 'white', borderRadius: '12px', padding: '28px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '24px' },
  hint: { fontSize: '13px', color: '#6b7280', marginBottom: '18px' },
  form: { display: 'flex', gap: '12px', marginBottom: '20px' },
  input: { flex: 1, padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px', fontFamily: 'monospace', outline: 'none', letterSpacing: '1px' },
  btn: { background: '#004080', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' },
  resultBox: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', borderRadius: '8px' },
  resultIcon: { fontSize: '22px', fontWeight: '700', minWidth: '32px', textAlign: 'center' },
  resultTitle: { fontWeight: '700', fontSize: '16px', marginBottom: '2px' },
  resultSub: { fontSize: '13px', opacity: 0.85 },
  logSection: {},
  logHeading: { fontSize: '16px', fontWeight: '700', color: '#374151', margin: '0 0 12px' },
  logList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  logEntry: { background: 'white', borderRadius: '8px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  logLeft: {},
  logName: { fontWeight: '600', fontSize: '15px', color: '#111' },
  logMeta: { fontSize: '12px', color: '#9ca3af', marginTop: '2px' },
  logRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' },
  logId: { fontSize: '13px', fontFamily: 'monospace', color: '#004080', fontWeight: '600' },
  logTime: { fontSize: '12px', color: '#9ca3af' },
}

export default StaffCheckIn

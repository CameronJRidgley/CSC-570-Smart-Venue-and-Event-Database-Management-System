import { useState } from 'react'

const mockTickets = [
  {
    id: 'TKT-001',
    eventName: 'Spring Fest',
    date: 'April 15, 2026',
    time: '6:00 PM',
    venue: 'Hampton Coliseum',
    section: 'Section A',
    row: 1,
    seat: 1,
    type: 'VIP',
    price: 99.99,
    status: 'valid',
    qrData: 'TKT-001-QR123ABC',
  },
  {
    id: 'TKT-002',
    eventName: 'Tech Innovators Conference',
    date: 'May 3, 2026',
    time: '9:00 AM',
    venue: 'Convention Center',
    section: 'VIP Table 4',
    row: null,
    seat: null,
    type: 'VIP',
    price: 149.00,
    status: 'valid',
    qrData: 'TKT-002-QR456DEF',
  },
  {
    id: 'TKT-003',
    eventName: 'Local Food Truck Fiesta',
    date: 'May 20, 2026',
    time: '11:00 AM',
    venue: 'Town Square Park',
    section: 'General Admission',
    row: null,
    seat: null,
    type: 'General',
    price: 15.00,
    status: 'valid',
    qrData: 'TKT-003-QR789GHI',
  },
]

const statusStyle = {
  valid:     { bg: '#d1fae5', text: '#065f46' },
  used:      { bg: '#f3f4f6', text: '#6b7280' },
  cancelled: { bg: '#fee2e2', text: '#991b1b' },
}

function TicketCard({ ticket }) {
  const [open, setOpen] = useState(false)
  const st = statusStyle[ticket.status] || statusStyle.valid
  const seatLabel = ticket.row ? `${ticket.section} · Row ${ticket.row}, Seat ${ticket.seat}` : ticket.section

  return (
    <div style={styles.card}>
      <div style={styles.left} />
      <div style={styles.body}>
        <div style={styles.topRow}>
          <div>
            <h3 style={styles.eventName}>{ticket.eventName}</h3>
            <p style={styles.meta}>{ticket.date} &nbsp;·&nbsp; {ticket.time}</p>
            <p style={styles.meta}>{ticket.venue}</p>
          </div>
          <div style={styles.right}>
            <span style={{ ...styles.statusBadge, background: st.bg, color: st.text }}>
              {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
            </span>
            <span style={styles.price}>${ticket.price.toFixed(2)}</span>
          </div>
        </div>

        <div style={styles.divider} />

        <div style={styles.bottomRow}>
          <div>
            <span style={styles.detailLabel}>Ticket Type</span>
            <span style={styles.detailValue}>{ticket.type}</span>
          </div>
          <div>
            <span style={styles.detailLabel}>Seat</span>
            <span style={styles.detailValue}>{seatLabel}</span>
          </div>
          <div>
            <span style={styles.detailLabel}>Ticket ID</span>
            <span style={styles.detailValue}>{ticket.id}</span>
          </div>
          <button style={styles.qrBtn} onClick={() => setOpen(o => !o)}>
            {open ? 'Hide QR' : 'Show QR'}
          </button>
        </div>

        {open && (
          <div style={styles.qrPanel}>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${ticket.qrData}`}
              alt="QR Code"
            />
            <p style={styles.qrHint}>Scan at the entry gate</p>
          </div>
        )}
      </div>
    </div>
  )
}

function MyTickets() {
  return (
    <div>
      <h2 style={styles.heading}>My Tickets</h2>
      {mockTickets.length === 0 ? (
        <p style={{ color: '#888' }}>You don't have any tickets yet.</p>
      ) : (
        <div style={styles.list}>
          {mockTickets.map(t => <TicketCard key={t.id} ticket={t} />)}
        </div>
      )}
    </div>
  )
}

const styles = {
  heading: { fontSize: '20px', fontWeight: '700', color: '#003366', margin: '0 0 20px' },
  list:    { display: 'flex', flexDirection: 'column', gap: '16px' },
  card: {
    display: 'flex',
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  left: {
    width: '6px',
    background: '#004080',
    flexShrink: 0,
  },
  body: { flex: 1, padding: '20px 24px' },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventName: { fontSize: '18px', fontWeight: '700', color: '#111', margin: '0 0 6px' },
  meta:      { fontSize: '14px', color: '#666', margin: '2px 0' },
  right:     { textAlign: 'right', flexShrink: 0, marginLeft: '16px' },
  statusBadge: {
    display: 'inline-block',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '3px 10px',
    borderRadius: '20px',
    marginBottom: '8px',
  },
  price: { display: 'block', fontSize: '20px', fontWeight: '700', color: '#004080' },
  divider: { borderTop: '1px dashed #e5e7eb', margin: '16px 0' },
  bottomRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    flexWrap: 'wrap',
  },
  detailLabel: {
    display: 'block',
    fontSize: '11px',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '2px',
  },
  detailValue: { fontSize: '14px', fontWeight: '600', color: '#333' },
  qrBtn: {
    marginLeft: 'auto',
    background: '#004080',
    color: 'white',
    border: 'none',
    padding: '8px 18px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  qrPanel: {
    marginTop: '16px',
    padding: '20px',
    background: '#f8f9ff',
    borderRadius: '8px',
    border: '1px dashed #c7d2fe',
    textAlign: 'center',
  },
  qrHint: { margin: '10px 0 0', fontSize: '13px', color: '#666' },
}

export default MyTickets

// Author: Nicco Hill
// AdminApprovals.jsx — Central approval hub for admins.
// Handles three types of pending requests:
//   👤 Staff Account Requests — new Admin/Organizer/Security registrations awaiting activation.
//   📅 Event Requests — organizer-submitted events that need approval before going public.
//   🛒 Vendor Applications — vendor booth requests for specific events.
// Each item can be approved (with optional note), rejected (with optional note), or undone.
// Items are filtered by status: Pending / Approved / Rejected.

import { useState } from 'react'

const INITIAL_ACCOUNTS = [
  { id: 20, type: 'account', name: 'Tyler Brooks',  email: 'tyler.b@example.com',  role: 'organizer', submitted: '2026-04-27', status: 'pending', note: '' },
  { id: 21, type: 'account', name: 'Sophie Grant',  email: 'sophie.g@example.com', role: 'security',  submitted: '2026-04-28', status: 'pending', note: '' },
  { id: 22, type: 'account', name: 'Marcus Reed',   email: 'm.reed@example.com',   role: 'admin',     submitted: '2026-04-29', status: 'pending', note: '' },
]

const INITIAL_EVENTS = [
  { id: 1, type: 'event', title: 'Jazz Under the Pines', organizer: 'organizer@example.com', date: '2026-08-12', venue: 'Pine Ridge Amphitheater, Richmond, VA', capacity: 800, price: 60, submitted: '2026-04-20', status: 'pending', note: '' },
  { id: 2, type: 'event', title: 'Fall Harvest Festival',organizer: 'carol.jones@mail.com',  date: '2026-10-03', venue: 'Green Acres Farm, Charlottesville, VA',  capacity: 1500,price: 25, submitted: '2026-04-22', status: 'pending', note: '' },
  { id: 3, type: 'event', title: 'Winter Gala 2026',     organizer: 'organizer@example.com', date: '2026-12-18', venue: 'Grand Ballroom, Norfolk, VA',            capacity: 400, price: 120,submitted: '2026-04-25', status: 'pending', note: '' },
]

const INITIAL_VENDORS = [
  { id: 10, type: 'vendor', business: 'Sunrise Smoothies',  contact: 'Amy Chen',    email: 'amy@sunrise.com',    vendorType: 'Food & Beverage', event: 'Spring Music Festival',        submitted: '2026-04-18', status: 'pending', note: '' },
  { id: 11, type: 'vendor', business: 'Pixel Art Prints',   contact: 'Jordan Bell', email: 'jb@pixelart.com',    vendorType: 'Merchandise',     event: 'Summer Music Festival',        submitted: '2026-04-21', status: 'pending', note: '' },
  { id: 12, type: 'vendor', business: 'TechGadget Rentals', contact: 'Sam Wu',      email: 'sam@techgadget.com', vendorType: 'Equipment/Rentals',event: 'Tech Innovators Conference',   submitted: '2026-04-26', status: 'pending', note: '' },
]

const STATUS_STYLES = {
  pending:  { bg: '#fef3c7', text: '#92400e', label: 'Pending' },
  approved: { bg: '#d1fae5', text: '#065f46', label: 'Approved' },
  rejected: { bg: '#fee2e2', text: '#991b1b', label: 'Rejected' },
}

function AdminApprovals() {
  const [events, setEvents]     = useState(INITIAL_EVENTS)
  const [vendors, setVendors]   = useState(INITIAL_VENDORS)
  const [accounts, setAccounts] = useState(INITIAL_ACCOUNTS)
  const [tab, setTab]           = useState('pending')
  const [noteModal, setNoteModal] = useState(null) // { id, kind, action }
  const [noteText, setNoteText]   = useState('')

  const allItems = [
    ...accounts.map(a => ({ ...a, kind: 'account' })),
    ...events.map(e => ({ ...e, kind: 'event' })),
    ...vendors.map(v => ({ ...v, kind: 'vendor' })),
  ]

  const pendingCount  = allItems.filter(i => i.status === 'pending').length
  const approvedCount = allItems.filter(i => i.status === 'approved').length
  const rejectedCount = allItems.filter(i => i.status === 'rejected').length

  function applyDecision(id, kind, action, note) {
    const updater = prev => prev.map(item =>
      item.id === id ? { ...item, status: action, note } : item
    )
    if (kind === 'account') setAccounts(updater)
    if (kind === 'event')   setEvents(updater)
    if (kind === 'vendor')  setVendors(updater)
  }

  function openNote(id, kind, action) {
    setNoteText('')
    setNoteModal({ id, kind, action })
  }

  function confirmNote() {
    if (!noteModal) return
    applyDecision(noteModal.id, noteModal.kind, noteModal.action, noteText)
    setNoteModal(null)
  }

  const filtered = allItems.filter(i =>
    tab === 'pending'  ? i.status === 'pending'  :
    tab === 'approved' ? i.status === 'approved' :
                         i.status === 'rejected'
  )

  return (
    <div>
      <h2 style={styles.heading}>Approvals</h2>

      {/* Summary pills */}
      <div style={styles.summaryRow}>
        <button style={{ ...styles.tabPill, ...(tab === 'pending'  ? styles.tabPillActive  : {}) }} onClick={() => setTab('pending')}>
          Pending <span style={styles.pillCount}>{pendingCount}</span>
        </button>
        <button style={{ ...styles.tabPill, ...(tab === 'approved' ? styles.tabPillApproved : {}) }} onClick={() => setTab('approved')}>
          Approved <span style={styles.pillCount}>{approvedCount}</span>
        </button>
        <button style={{ ...styles.tabPill, ...(tab === 'rejected' ? styles.tabPillRejected : {}) }} onClick={() => setTab('rejected')}>
          Rejected <span style={styles.pillCount}>{rejectedCount}</span>
        </button>
      </div>

      {filtered.length === 0 && (
        <div style={styles.empty}>No {tab} items.</div>
      )}

      <div style={styles.list}>
        {filtered.map(item => {
          const ss = STATUS_STYLES[item.status]
          return (
            <div key={item.id} style={styles.card}>
              <div style={styles.cardTop}>
                <div>
                  <div style={styles.cardTypeTag}>
                    {item.kind === 'account' ? '👤 Staff Account Request'
                     : item.kind === 'event' ? '📅 Event Request'
                     : '🛒 Vendor Application'}
                  </div>
                  <div style={styles.cardTitle}>
                    {item.kind === 'account' ? item.name
                     : item.kind === 'event'  ? item.title
                     : item.business}
                  </div>
                  {item.kind === 'account' && (
                    <div style={styles.cardMeta}>
                      Email: {item.email} &nbsp;·&nbsp; Requested Role:&nbsp;
                      <strong style={{ textTransform: 'capitalize' }}>{item.role}</strong>
                    </div>
                  )}
                  {item.kind === 'event' && (
                    <div style={styles.cardMeta}>
                      Organizer: {item.organizer} &nbsp;·&nbsp; {item.date} &nbsp;·&nbsp; {item.venue}
                      <br />
                      Capacity: {item.capacity} &nbsp;·&nbsp; Ticket Price: ${item.price}
                    </div>
                  )}
                  {item.kind === 'vendor' && (
                    <div style={styles.cardMeta}>
                      Contact: {item.contact} ({item.email}) &nbsp;·&nbsp; Type: {item.vendorType}
                      <br />
                      Requesting to vend at: <strong>{item.event}</strong>
                    </div>
                  )}
                  <div style={styles.cardSubmitted}>Submitted {item.submitted}</div>
                </div>
                <span style={{ ...styles.statusBadge, background: ss.bg, color: ss.text }}>{ss.label}</span>
              </div>

              {item.note && (
                <div style={styles.noteBox}>
                  <span style={styles.noteLabel}>Note: </span>{item.note}
                </div>
              )}

              {item.status === 'pending' && (
                <div style={styles.actionRow}>
                  <button style={styles.approveBtn} onClick={() => applyDecision(item.id, item.kind, 'approved', '')}>
                    ✓ Approve
                  </button>
                  <button style={styles.rejectBtn} onClick={() => openNote(item.id, item.kind, 'rejected')}>
                    ✗ Reject
                  </button>
                  <button style={styles.noteBtn} onClick={() => openNote(item.id, item.kind, 'approved')}>
                    Approve with Note
                  </button>
                </div>
              )}

              {item.status !== 'pending' && (
                <div style={styles.actionRow}>
                  <button style={styles.undoBtn} onClick={() => applyDecision(item.id, item.kind, 'pending', '')}>
                    Undo
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Note modal */}
      {noteModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>
              {noteModal.action === 'approved' ? 'Approve with Note' : 'Reject with Note'}
            </h3>
            <p style={styles.modalSub}>Optional — leave a note for the submitter.</p>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="e.g. Please confirm the venue permit before the event date."
              rows={4}
              style={styles.modalTextarea}
              autoFocus
            />
            <div style={styles.modalActions}>
              <button
                style={noteModal.action === 'approved' ? styles.approveBtn : styles.rejectBtn}
                onClick={confirmNote}
              >
                Confirm {noteModal.action === 'approved' ? 'Approval' : 'Rejection'}
              </button>
              <button style={styles.cancelBtn} onClick={() => setNoteModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  heading:  { fontSize: '22px', fontWeight: '700', color: '#003366', margin: '0 0 20px' },

  summaryRow: { display: 'flex', gap: '8px', marginBottom: '20px' },
  tabPill:    { background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  tabPillActive:   { background: '#fef3c7', color: '#92400e', borderColor: '#fcd34d' },
  tabPillApproved: { background: '#d1fae5', color: '#065f46', borderColor: '#6ee7b7' },
  tabPillRejected: { background: '#fee2e2', color: '#991b1b', borderColor: '#fca5a5' },
  pillCount: { background: 'rgba(0,0,0,0.1)', borderRadius: '99px', padding: '1px 7px', fontSize: '12px' },

  empty: { textAlign: 'center', padding: '40px', color: '#9ca3af', fontSize: '15px' },
  list:  { display: 'flex', flexDirection: 'column', gap: '12px' },

  card:      { background: 'white', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  cardTop:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' },
  cardTypeTag:  { fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' },
  cardTitle:    { fontSize: '17px', fontWeight: '700', color: '#111', marginBottom: '6px' },
  cardMeta:     { fontSize: '13px', color: '#6b7280', lineHeight: '1.7' },
  cardSubmitted:{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' },
  statusBadge:  { fontSize: '12px', fontWeight: '700', padding: '4px 12px', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0, marginLeft: '12px' },

  noteBox:  { background: '#f8f9ff', border: '1px solid #e0e7ff', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: '#374151', marginBottom: '12px' },
  noteLabel:{ fontWeight: '700' },

  actionRow:  { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  approveBtn: { background: '#065f46', color: 'white', border: 'none', padding: '8px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  rejectBtn:  { background: 'white', color: '#dc2626', border: '1px solid #fca5a5', padding: '8px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  noteBtn:    { background: 'white', color: '#374151', border: '1px solid #d1d5db', padding: '8px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  undoBtn:    { background: 'white', color: '#6b7280', border: '1px solid #d1d5db', padding: '8px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  cancelBtn:  { background: 'white', color: '#6b7280', border: '1px solid #d1d5db', padding: '8px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },

  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:        { background: 'white', borderRadius: '14px', padding: '32px', width: '100%', maxWidth: '460px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  modalTitle:   { fontSize: '18px', fontWeight: '700', color: '#111', margin: '0 0 6px' },
  modalSub:     { fontSize: '13px', color: '#6b7280', margin: '0 0 16px' },
  modalTextarea:{ width: '100%', padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '16px' },
  modalActions: { display: 'flex', gap: '8px' },
}

export default AdminApprovals

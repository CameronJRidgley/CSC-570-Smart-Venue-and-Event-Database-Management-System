// Author: Nicco Hill
// PersonnelAssignment.jsx — Security personnel management for admins and security staff.
// Features:
//   • Add new officers to the roster (name, badge, phone, initial status).
//   • Change any officer's duty status inline (On Duty / On Break / Off Duty).
//   • Assign officers from the unassigned pool to a specific zone via dropdown.
//   • Remove officers from a zone — they return to the unassigned pool.
// State is per-session; assignments persist across tab switches but reset on page reload.

import { useState } from 'react'

const STATUS_COLORS = {
  'On Duty':  { bg: '#d1fae5', text: '#065f46' },
  'On Break': { bg: '#fef3c7', text: '#92400e' },
  'Off Duty': { bg: '#f3f4f6', text: '#6b7280' },
}

const STATUSES = ['On Duty', 'On Break', 'Off Duty']

const SEED_PERSONNEL = [
  { id: 'S-001', name: 'James Carter',  badge: 'B-1042', status: 'On Duty',  phone: '555-0101' },
  { id: 'S-002', name: 'Maria Lopez',   badge: 'B-1043', status: 'On Duty',  phone: '555-0102' },
  { id: 'S-003', name: 'Devon Harris',  badge: 'B-1051', status: 'On Break', phone: '555-0103' },
  { id: 'S-004', name: 'Priya Patel',   badge: 'B-1044', status: 'On Duty',  phone: '555-0104' },
  { id: 'S-005', name: 'Tom Nguyen',    badge: 'B-1045', status: 'On Duty',  phone: '555-0105' },
  { id: 'S-006', name: 'Lisa Kim',      badge: 'B-1046', status: 'On Duty',  phone: '555-0106' },
  { id: 'S-007', name: 'Marcus Webb',   badge: 'B-1047', status: 'On Duty',  phone: '555-0107' },
  { id: 'S-008', name: 'Sandra Cole',   badge: 'B-1048', status: 'On Break', phone: '555-0108' },
  { id: 'S-009', name: 'Ray Thompson',  badge: 'B-1049', status: 'On Duty',  phone: '555-0109' },
  { id: 'S-010', name: 'Angela Brooks', badge: 'B-1052', status: 'On Duty',  phone: '555-0110' },
  { id: 'S-011', name: 'Chris Evans',   badge: 'B-1053', status: 'On Duty',  phone: '555-0111' },
  { id: 'S-012', name: 'Nadia Russo',   badge: 'B-1054', status: 'On Break', phone: '555-0112' },
  { id: 'S-013', name: 'Frank Torres',  badge: 'B-1055', status: 'On Duty',  phone: '555-0113' },
  { id: 'S-014', name: 'Diana Moore',   badge: 'B-1056', status: 'Off Duty', phone: '555-0114' },
  { id: 'S-015', name: 'Kevin Grant',   badge: 'B-1057', status: 'Off Duty', phone: '555-0115' },
]

const SEED_ASSIGNMENTS = {
  'Spring Music Festival': {
    zones:      [
      { name: 'Main Stage',    personnelIds: ['S-001', 'S-002', 'S-003'] },
      { name: 'East Entrance', personnelIds: ['S-004', 'S-005'] },
      { name: 'West Entrance', personnelIds: ['S-006'] },
      { name: 'VIP Area',      personnelIds: ['S-007', 'S-008'] },
      { name: 'Food Court',    personnelIds: ['S-009'] },
    ],
    unassigned: ['S-014', 'S-015'],
  },
  'Tech Innovators Conference': {
    zones:      [
      { name: 'Main Hall',  personnelIds: ['S-010', 'S-011'] },
      { name: 'Lobby',      personnelIds: ['S-012'] },
      { name: 'VIP Lounge', personnelIds: ['S-013'] },
    ],
    unassigned: ['S-014', 'S-015'],
  },
}

const EMPTY_FORM = { name: '', badge: '', phone: '', status: 'On Duty' }

let nextId = 16

function PersonnelAssignment() {
  const [personnel, setPersonnel]         = useState(SEED_PERSONNEL)
  const [assignments, setAssignments]     = useState(SEED_ASSIGNMENTS)
  const [selectedEvent, setSelectedEvent] = useState('Spring Music Festival')
  const [expandedZone, setExpandedZone]   = useState(null)
  const [showAddForm, setShowAddForm]     = useState(false)
  const [form, setForm]                   = useState(EMPTY_FORM)
  const [formErrors, setFormErrors]       = useState({})

  const eventData   = assignments[selectedEvent]
  const allAssigned = eventData.zones.flatMap(z => z.personnelIds)
  const onDutyCount = allAssigned
    .map(id => personnel.find(p => p.id === id))
    .filter(p => p?.status === 'On Duty').length

  function getPerson(id) { return personnel.find(p => p.id === id) }

  // ── Status change ──────────────────────────────────────────
  function changeStatus(personId, newStatus) {
    setPersonnel(prev => prev.map(p => p.id === personId ? { ...p, status: newStatus } : p))
  }

  // ── Zone: remove ───────────────────────────────────────────
  function removeFromZone(zoneName, personId) {
    setAssignments(prev => ({
      ...prev,
      [selectedEvent]: {
        zones: prev[selectedEvent].zones.map(z =>
          z.name === zoneName ? { ...z, personnelIds: z.personnelIds.filter(id => id !== personId) } : z
        ),
        unassigned: [...prev[selectedEvent].unassigned, personId],
      },
    }))
  }

  // ── Zone: add ──────────────────────────────────────────────
  function addToZone(zoneName, personId) {
    if (!personId) return
    setAssignments(prev => ({
      ...prev,
      [selectedEvent]: {
        zones: prev[selectedEvent].zones.map(z =>
          z.name === zoneName ? { ...z, personnelIds: [...z.personnelIds, personId] } : z
        ),
        unassigned: prev[selectedEvent].unassigned.filter(id => id !== personId),
      },
    }))
  }

  // ── Add new person ─────────────────────────────────────────
  function validateForm() {
    const e = {}
    if (!form.name.trim())  e.name  = 'Required'
    if (!form.badge.trim()) e.badge = 'Required'
    if (!form.phone.trim()) e.phone = 'Required'
    return e
  }

  function handleAddPerson(e) {
    e.preventDefault()
    const errs = validateForm()
    if (Object.keys(errs).length) { setFormErrors(errs); return }

    const newId = `S-${String(nextId++).padStart(3, '0')}`
    const newPerson = { id: newId, name: form.name.trim(), badge: form.badge.trim(), phone: form.phone.trim(), status: form.status }

    setPersonnel(prev => [...prev, newPerson])
    // Add to unassigned pool for every event
    setAssignments(prev => {
      const updated = {}
      for (const [ev, data] of Object.entries(prev)) {
        updated[ev] = { ...data, unassigned: [...data.unassigned, newId] }
      }
      return updated
    })
    setForm(EMPTY_FORM)
    setFormErrors({})
    setShowAddForm(false)
  }

  const totalCount = allAssigned.length + eventData.unassigned.length

  return (
    <div>
      {/* Header */}
      <div style={styles.topRow}>
        <h2 style={styles.heading}>Personnel Assignment</h2>
        <div style={styles.headerRight}>
          <span style={styles.totalBadge}>{totalCount} total</span>
          <span style={styles.dutyBadge}>{onDutyCount} on duty</span>
          <span style={styles.unassignedBadge}>{eventData.unassigned.length} unassigned</span>
          <button style={styles.addPersonBtn} onClick={() => setShowAddForm(s => !s)}>
            {showAddForm ? 'Cancel' : '+ Add Personnel'}
          </button>
        </div>
      </div>

      {/* Add personnel form */}
      {showAddForm && (
        <form onSubmit={handleAddPerson} style={styles.addForm}>
          <div style={styles.formTitle}>New Security Personnel</div>
          <div style={styles.formRow}>
            <div style={styles.formField}>
              <label style={styles.formLabel}>Full Name</label>
              <input
                value={form.name}
                onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setFormErrors(er => ({ ...er, name: '' })) }}
                placeholder="e.g. Jordan Smith"
                style={{ ...styles.formInput, ...(formErrors.name ? styles.inputErr : {}) }}
              />
              {formErrors.name && <span style={styles.errMsg}>{formErrors.name}</span>}
            </div>
            <div style={styles.formField}>
              <label style={styles.formLabel}>Badge #</label>
              <input
                value={form.badge}
                onChange={e => { setForm(f => ({ ...f, badge: e.target.value })); setFormErrors(er => ({ ...er, badge: '' })) }}
                placeholder="e.g. B-1060"
                style={{ ...styles.formInput, ...(formErrors.badge ? styles.inputErr : {}) }}
              />
              {formErrors.badge && <span style={styles.errMsg}>{formErrors.badge}</span>}
            </div>
            <div style={styles.formField}>
              <label style={styles.formLabel}>Phone</label>
              <input
                value={form.phone}
                onChange={e => { setForm(f => ({ ...f, phone: e.target.value })); setFormErrors(er => ({ ...er, phone: '' })) }}
                placeholder="e.g. 555-0120"
                style={{ ...styles.formInput, ...(formErrors.phone ? styles.inputErr : {}) }}
              />
              {formErrors.phone && <span style={styles.errMsg}>{formErrors.phone}</span>}
            </div>
            <div style={styles.formField}>
              <label style={styles.formLabel}>Initial Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                style={styles.formInput}
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" style={styles.submitBtn}>Add to Roster</button>
        </form>
      )}

      {/* Event selector */}
      <select
        value={selectedEvent}
        onChange={e => { setSelectedEvent(e.target.value); setExpandedZone(null) }}
        style={styles.eventSelect}
      >
        {Object.keys(assignments).map(ev => (
          <option key={ev} value={ev}>{ev}</option>
        ))}
      </select>

      {/* Unassigned pool */}
      {eventData.unassigned.length > 0 && (
        <div style={styles.poolCard}>
          <div style={styles.poolTitle}>Unassigned Personnel — {eventData.unassigned.length}</div>
          <div style={styles.poolList}>
            {eventData.unassigned.map(id => {
              const p  = getPerson(id)
              const sc = STATUS_COLORS[p?.status] || STATUS_COLORS['Off Duty']
              return (
                <div key={id} style={styles.poolRow}>
                  <div style={styles.personAvatar}>{p?.name.split(' ').map(n => n[0]).join('')}</div>
                  <div style={styles.poolInfo}>
                    <div style={styles.personName}>{p?.name}</div>
                    <div style={styles.personSub}>Badge {p?.badge}</div>
                  </div>
                  <select
                    value={p?.status}
                    onChange={e => changeStatus(id, e.target.value)}
                    style={{ ...styles.statusSelect, background: sc.bg, color: sc.text }}
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Zone cards */}
      <div style={styles.zoneList}>
        {eventData.zones.map(zone => {
          const isOpen    = expandedZone === zone.name
          const zonePpl   = zone.personnelIds.map(id => getPerson(id)).filter(Boolean)
          const dutyCount = zonePpl.filter(p => p.status === 'On Duty').length
          const available = eventData.unassigned.map(id => getPerson(id)).filter(Boolean)

          return (
            <div key={zone.name} style={styles.zoneCard}>
              <button style={styles.zoneHeader} onClick={() => setExpandedZone(isOpen ? null : zone.name)}>
                <div>
                  <div style={styles.zoneName}>{zone.name}</div>
                  <div style={styles.zoneMeta}>{zonePpl.length} assigned · {dutyCount} on duty</div>
                </div>
                <div style={styles.zoneRight}>
                  {zonePpl.map(p => (
                    <div key={p.id} style={{ ...styles.dot, background: STATUS_COLORS[p.status]?.text || '#9ca3af' }} title={`${p.name} — ${p.status}`} />
                  ))}
                  {zonePpl.length === 0 && <span style={styles.emptyDot}>Empty</span>}
                  <span style={styles.chevron}>{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {isOpen && (
                <div style={styles.personnelList}>
                  {zonePpl.length === 0 && <div style={styles.emptyZone}>No one assigned to this zone.</div>}

                  {zonePpl.map(p => {
                    const sc = STATUS_COLORS[p.status] || STATUS_COLORS['Off Duty']
                    return (
                      <div key={p.id} style={styles.personRow}>
                        <div style={styles.personLeft}>
                          <div style={styles.personAvatar}>{p.name.split(' ').map(n => n[0]).join('')}</div>
                          <div>
                            <div style={styles.personName}>{p.name}</div>
                            <div style={styles.personSub}>Badge {p.badge} · {p.phone}</div>
                          </div>
                        </div>
                        <div style={styles.personRight}>
                          <select
                            value={p.status}
                            onChange={e => changeStatus(p.id, e.target.value)}
                            style={{ ...styles.statusSelect, background: sc.bg, color: sc.text }}
                          >
                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <button style={styles.removeBtn} onClick={() => removeFromZone(zone.name, p.id)}>
                            Remove
                          </button>
                        </div>
                      </div>
                    )
                  })}

                  <div style={styles.addRow}>
                    <select
                      style={styles.addSelect}
                      defaultValue=""
                      key={zone.name + eventData.unassigned.join()}
                      onChange={e => { addToZone(zone.name, e.target.value); e.target.value = '' }}
                    >
                      <option value="" disabled>
                        {available.length ? '+ Assign personnel to this zone…' : 'No unassigned personnel available'}
                      </option>
                      {available.map(p => (
                        <option key={p.id} value={p.id}>{p.name} — {p.badge} ({p.status})</option>
                      ))}
                    </select>
                  </div>
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
  topRow:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' },
  heading:     { fontSize: '22px', fontWeight: '700', color: '#003366', margin: 0 },
  headerRight: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  totalBadge:      { fontSize: '13px', background: '#f3f4f6', color: '#374151', padding: '4px 12px', borderRadius: '20px', fontWeight: '600' },
  dutyBadge:       { fontSize: '13px', background: '#d1fae5', color: '#065f46', padding: '4px 12px', borderRadius: '20px', fontWeight: '600' },
  unassignedBadge: { fontSize: '13px', background: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: '20px', fontWeight: '600' },
  addPersonBtn:    { background: '#004080', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },

  addForm:    { background: 'white', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '16px', border: '1px dashed #004080' },
  formTitle:  { fontSize: '15px', fontWeight: '700', color: '#003366', marginBottom: '14px' },
  formRow:    { display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' },
  formField:  { display: 'flex', flexDirection: 'column', gap: '5px', flex: '1', minWidth: '150px' },
  formLabel:  { fontSize: '13px', fontWeight: '600', color: '#374151' },
  formInput:  { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', background: 'white' },
  inputErr:   { borderColor: '#fca5a5' },
  errMsg:     { fontSize: '12px', color: '#dc2626' },
  submitBtn:  { background: '#004080', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },

  eventSelect: { width: '100%', padding: '11px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px', outline: 'none', background: 'white', marginBottom: '16px', cursor: 'pointer' },

  poolCard:  { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '14px 18px', marginBottom: '16px' },
  poolTitle: { fontSize: '13px', fontWeight: '700', color: '#92400e', marginBottom: '10px' },
  poolList:  { display: 'flex', flexDirection: 'column', gap: '8px' },
  poolRow:   { display: 'flex', alignItems: 'center', gap: '10px' },
  poolInfo:  { flex: 1 },

  statusSelect: { border: 'none', borderRadius: '20px', padding: '4px 10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', outline: 'none' },

  zoneList:  { display: 'flex', flexDirection: 'column', gap: '10px' },
  zoneCard:  { background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' },
  zoneHeader:{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' },
  zoneName:  { fontSize: '16px', fontWeight: '700', color: '#111', marginBottom: '2px' },
  zoneMeta:  { fontSize: '13px', color: '#6b7280' },
  zoneRight: { display: 'flex', alignItems: 'center', gap: '6px' },
  dot:       { width: '10px', height: '10px', borderRadius: '50%' },
  emptyDot:  { fontSize: '12px', color: '#9ca3af' },
  chevron:   { fontSize: '13px', color: '#9ca3af', marginLeft: '8px' },

  personnelList: { borderTop: '1px solid #f3f4f6', paddingBottom: '8px' },
  emptyZone:     { padding: '16px 20px', fontSize: '13px', color: '#9ca3af' },
  personRow:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #f9fafb' },
  personLeft:    { display: 'flex', alignItems: 'center', gap: '12px' },
  personRight:   { display: 'flex', alignItems: 'center', gap: '8px' },
  personAvatar:  { width: '36px', height: '36px', borderRadius: '50%', background: '#e0e7ff', color: '#3730a3', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  personName:    { fontSize: '14px', fontWeight: '600', color: '#111', marginBottom: '2px' },
  personSub:     { fontSize: '12px', color: '#9ca3af' },
  removeBtn:     { background: 'none', border: '1px solid #fca5a5', color: '#dc2626', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '500', whiteSpace: 'nowrap' },

  addRow:    { padding: '10px 20px' },
  addSelect: { width: '100%', padding: '10px 14px', border: '1px dashed #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#f9fafb', cursor: 'pointer', color: '#374151' },
}

export default PersonnelAssignment

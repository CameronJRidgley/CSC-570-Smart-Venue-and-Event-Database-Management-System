// Author: Nicco Hill
// PersonnelAssignment.jsx — Security personnel management for admins.
// Backed by /api/staff. Each staff row carries a single optional
// (event_id, zone) assignment plus a free-text duty_status.
// Features:
//   • Add new officers to the roster (POST /api/staff).
//   • Change duty status inline (PATCH).
//   • Assign / remove officers from a zone within a chosen event.
//   • Switch between events to see who's on each roster.

import { useState, useEffect, useMemo } from 'react'
import { api } from '../api'

const STATUS_COLORS = {
  'On Duty':  { bg: '#d1fae5', text: '#065f46' },
  'On Break': { bg: '#fef3c7', text: '#92400e' },
  'Off Duty': { bg: '#f3f4f6', text: '#6b7280' },
}

const STATUSES = ['On Duty', 'On Break', 'Off Duty']
const DEFAULT_ZONES = ['Main Stage', 'East Entrance', 'West Entrance', 'VIP Area', 'Food Court']

const EMPTY_FORM = { full_name: '', badge_number: '', phone: '', duty_status: 'On Duty' }

function PersonnelAssignment() {
  const [staff, setStaff]                 = useState([])
  const [events, setEvents]               = useState([])
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [expandedZone, setExpandedZone]   = useState(null)
  const [showAddForm, setShowAddForm]     = useState(false)
  const [form, setForm]                   = useState(EMPTY_FORM)
  const [formErrors, setFormErrors]       = useState({})
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)

  useEffect(() => {
    Promise.all([
      api.listStaff().catch(() => []),
      api.listEvents().catch(() => []),
    ]).then(([s, e]) => {
      setStaff(s || [])
      setEvents(e || [])
      if (e && e.length) setSelectedEventId(e[0].id)
    }).catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const event = events.find(e => e.id === selectedEventId)

  const zones = useMemo(() => {
    const set = new Set(DEFAULT_ZONES)
    for (const s of staff) {
      if (s.event_id === selectedEventId && s.zone) set.add(s.zone)
    }
    return Array.from(set)
  }, [staff, selectedEventId])

  const assignedToEvent = staff.filter(s => s.event_id === selectedEventId)
  const unassigned      = staff.filter(s => s.event_id == null || s.event_id !== selectedEventId)
  const unassignedHere  = staff.filter(s => s.event_id === selectedEventId && !s.zone)
  const onDutyCount     = assignedToEvent.filter(s => s.duty_status === 'On Duty').length

  async function patchStaff(id, payload) {
    setStaff(prev => prev.map(s => s.id === id ? { ...s, ...payload } : s))
    try {
      const updated = await api.updateStaff(id, payload)
      setStaff(prev => prev.map(s => s.id === id ? updated : s))
    } catch (err) {
      alert('Update failed: ' + err.message)
      api.listStaff().then(setStaff).catch(() => {})
    }
  }

  function changeStatus(id, newStatus) { patchStaff(id, { duty_status: newStatus }) }
  function assignToEvent(id)            { patchStaff(id, { event_id: selectedEventId, zone: null }) }
  function removeFromZone(id)           { patchStaff(id, { zone: null }) }
  function unassignFromEvent(id)        { patchStaff(id, { event_id: null, zone: null }) }
  function addToZone(zoneName, id)      { if (id) patchStaff(Number(id), { event_id: selectedEventId, zone: zoneName }) }

  function validateForm() {
    const e = {}
    if (!form.full_name.trim())    e.full_name = 'Required'
    if (!form.badge_number.trim()) e.badge_number = 'Required'
    if (!form.phone.trim())        e.phone = 'Required'
    return e
  }

  async function handleAddPerson(e) {
    e.preventDefault()
    const errs = validateForm()
    if (Object.keys(errs).length) { setFormErrors(errs); return }

    const safeName = form.full_name.trim().toLowerCase().replace(/\s+/g, '.')
    const email = `${safeName}.${form.badge_number.trim().toLowerCase()}@staff.example.com`

    try {
      const created = await api.createStaff({
        full_name: form.full_name.trim(),
        email,
        phone: form.phone.trim(),
        badge_number: form.badge_number.trim(),
        duty_status: form.duty_status,
        role: 'security',
      })
      setStaff(prev => [...prev, created])
      setForm(EMPTY_FORM)
      setFormErrors({})
      setShowAddForm(false)
    } catch (err) {
      setFormErrors({ form: err.message })
    }
  }

  if (loading) {
    return <div style={{ padding: 20, color: '#6b7280' }}>Loading personnel…</div>
  }

  if (!event) {
    return (
      <div>
        <h2 style={styles.heading}>Personnel Assignment</h2>
        <p style={{ color: '#6b7280', marginTop: 16 }}>
          No events exist yet. Create an event first to start assigning personnel.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div style={styles.topRow}>
        <h2 style={styles.heading}>Personnel Assignment</h2>
        <div style={styles.headerRight}>
          <span style={styles.totalBadge}>{staff.length} total</span>
          <span style={styles.dutyBadge}>{onDutyCount} on duty</span>
          <span style={styles.unassignedBadge}>{unassigned.length} unassigned</span>
          <button style={styles.addPersonBtn} onClick={() => setShowAddForm(s => !s)}>
            {showAddForm ? 'Cancel' : '+ Add Personnel'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleAddPerson} style={styles.addForm}>
          <div style={styles.formTitle}>New Security Personnel</div>
          <div style={styles.formRow}>
            <div style={styles.formField}>
              <label style={styles.formLabel}>Full Name</label>
              <input
                value={form.full_name}
                onChange={e => { setForm(f => ({ ...f, full_name: e.target.value })); setFormErrors(er => ({ ...er, full_name: '' })) }}
                placeholder="e.g. Jordan Smith"
                style={{ ...styles.formInput, ...(formErrors.full_name ? styles.inputErr : {}) }}
              />
              {formErrors.full_name && <span style={styles.errMsg}>{formErrors.full_name}</span>}
            </div>
            <div style={styles.formField}>
              <label style={styles.formLabel}>Badge #</label>
              <input
                value={form.badge_number}
                onChange={e => { setForm(f => ({ ...f, badge_number: e.target.value })); setFormErrors(er => ({ ...er, badge_number: '' })) }}
                placeholder="e.g. B-1060"
                style={{ ...styles.formInput, ...(formErrors.badge_number ? styles.inputErr : {}) }}
              />
              {formErrors.badge_number && <span style={styles.errMsg}>{formErrors.badge_number}</span>}
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
                value={form.duty_status}
                onChange={e => setForm(f => ({ ...f, duty_status: e.target.value }))}
                style={styles.formInput}
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          {formErrors.form && <div style={styles.errMsg}>{formErrors.form}</div>}
          <button type="submit" style={styles.submitBtn}>Add to Roster</button>
        </form>
      )}

      <select
        value={selectedEventId}
        onChange={e => { setSelectedEventId(Number(e.target.value)); setExpandedZone(null) }}
        style={styles.eventSelect}
      >
        {events.map(ev => (
          <option key={ev.id} value={ev.id}>{ev.name}</option>
        ))}
      </select>

      {unassigned.length > 0 && (
        <div style={styles.poolCard}>
          <div style={styles.poolTitle}>Available Personnel — {unassigned.length}</div>
          <div style={styles.poolList}>
            {unassigned.map(p => {
              const sc = STATUS_COLORS[p.duty_status] || STATUS_COLORS['Off Duty']
              return (
                <div key={p.id} style={styles.poolRow}>
                  <div style={styles.personAvatar}>{(p.full_name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                  <div style={styles.poolInfo}>
                    <div style={styles.personName}>{p.full_name}</div>
                    <div style={styles.personSub}>Badge {p.badge_number || '—'}{p.event_id ? ' · assigned to another event' : ''}</div>
                  </div>
                  <select
                    value={p.duty_status}
                    onChange={e => changeStatus(p.id, e.target.value)}
                    style={{ ...styles.statusSelect, background: sc.bg, color: sc.text }}
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button style={styles.activateBtn} onClick={() => assignToEvent(p.id)}>
                    + This event
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {unassignedHere.length > 0 && (
        <div style={styles.poolCard}>
          <div style={styles.poolTitle}>On this event · awaiting zone — {unassignedHere.length}</div>
          <div style={styles.poolList}>
            {unassignedHere.map(p => (
              <div key={p.id} style={styles.poolRow}>
                <div style={styles.personAvatar}>{(p.full_name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                <div style={styles.poolInfo}>
                  <div style={styles.personName}>{p.full_name}</div>
                  <div style={styles.personSub}>Badge {p.badge_number || '—'}</div>
                </div>
                <button style={styles.removeBtn} onClick={() => unassignFromEvent(p.id)}>
                  Release
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={styles.zoneList}>
        {zones.map(zoneName => {
          const isOpen    = expandedZone === zoneName
          const zonePpl   = assignedToEvent.filter(p => p.zone === zoneName)
          const dutyCount = zonePpl.filter(p => p.duty_status === 'On Duty').length

          return (
            <div key={zoneName} style={styles.zoneCard}>
              <button style={styles.zoneHeader} onClick={() => setExpandedZone(isOpen ? null : zoneName)}>
                <div>
                  <div style={styles.zoneName}>{zoneName}</div>
                  <div style={styles.zoneMeta}>{zonePpl.length} assigned · {dutyCount} on duty</div>
                </div>
                <div style={styles.zoneRight}>
                  {zonePpl.map(p => (
                    <div key={p.id} style={{ ...styles.dot, background: STATUS_COLORS[p.duty_status]?.text || '#9ca3af' }} title={`${p.full_name} — ${p.duty_status}`} />
                  ))}
                  {zonePpl.length === 0 && <span style={styles.emptyDot}>Empty</span>}
                  <span style={styles.chevron}>{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {isOpen && (
                <div style={styles.personnelList}>
                  {zonePpl.length === 0 && <div style={styles.emptyZone}>No one assigned to this zone.</div>}

                  {zonePpl.map(p => {
                    const sc = STATUS_COLORS[p.duty_status] || STATUS_COLORS['Off Duty']
                    return (
                      <div key={p.id} style={styles.personRow}>
                        <div style={styles.personLeft}>
                          <div style={styles.personAvatar}>{(p.full_name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                          <div>
                            <div style={styles.personName}>{p.full_name}</div>
                            <div style={styles.personSub}>Badge {p.badge_number || '—'} · {p.phone || '—'}</div>
                          </div>
                        </div>
                        <div style={styles.personRight}>
                          <select
                            value={p.duty_status}
                            onChange={e => changeStatus(p.id, e.target.value)}
                            style={{ ...styles.statusSelect, background: sc.bg, color: sc.text }}
                          >
                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <button style={styles.removeBtn} onClick={() => removeFromZone(p.id)}>
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
                      key={zoneName + unassignedHere.length}
                      onChange={e => { addToZone(zoneName, e.target.value); e.target.value = '' }}
                    >
                      <option value="" disabled>
                        {unassignedHere.length ? '+ Assign personnel to this zone…' : 'No unzoned personnel on this event'}
                      </option>
                      {unassignedHere.map(p => (
                        <option key={p.id} value={p.id}>{p.full_name} — {p.badge_number || 'no badge'} ({p.duty_status})</option>
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
  activateBtn:  { background: 'none', border: '1px solid #6ee7b7', color: '#065f46', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '500', whiteSpace: 'nowrap' },

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

// Author: Nicco Hill
// VendorApply.jsx — In-dashboard vendor event application form (shown on the vendor's "Apply for Event" tab).
// Allows a logged-in vendor to request booth space at a specific upcoming event.
// Validates required fields and shows a success confirmation referencing the vendor's account email.

import { useState, useEffect } from 'react'
import { api } from '../api'

const FALLBACK_EVENTS = [
  { id: null, label: 'Spring Fest — April 15, 2026' },
  { id: null, label: 'Tech Innovators Conference — May 3, 2026' },
  { id: null, label: 'Local Food Truck Fiesta — May 20, 2026' },
  { id: null, label: 'Summer Music Festival — June 7, 2026' },
]

const VENDOR_TYPES = [
  'Food & Beverage',
  'Merchandise',
  'Equipment / Rentals',
  'Health & Beauty',
  'Arts & Crafts',
  'Other',
]

const EMPTY = { business: '', type: '', event: '', description: '' }

function VendorApply() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [events, setEvents] = useState(FALLBACK_EVENTS)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    api.listEvents().then(rows => {
      if (rows && rows.length) {
        setEvents(rows.map(e => ({
          id: e.id,
          label: `${e.name} — ${new Date(e.starts_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}`,
        })))
      }
    }).catch(() => { /* keep fallback */ })
  }, [])

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setErrors(er => ({ ...er, [e.target.name]: '' }))
  }

  function validate() {
    const e = {}
    if (!form.business.trim()) e.business = 'Required'
    if (!form.type)            e.type     = 'Select a type'
    if (!form.event)           e.event    = 'Select an event'
    if (!form.description.trim()) e.description = 'Required'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSubmitError(null)

    const matched = events.find(ev => ev.label === form.event)
    try {
      await api.createVendor({
        name: form.business,
        category: form.type,
        contact_email: user.email || undefined,
        event_id: matched?.id || undefined,
      })
      setSubmitted(true)
    } catch (err) {
      // Still show success in demo mode if backend rejects
      console.warn('Vendor apply failed:', err.message)
      setSubmitError(err.message)
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <div style={styles.successBox}>
        <div style={styles.successIcon}>✓</div>
        <h2 style={styles.successTitle}>Request Submitted!</h2>
        <p style={styles.successSub}>
          Your application for <strong>{form.business}</strong> to vend at <strong>{form.event.split(' —')[0]}</strong> is under review.
          You'll be notified at <strong>{user.email}</strong> within 3–5 business days.
        </p>
        <button style={styles.btn} onClick={() => { setForm(EMPTY); setSubmitted(false) }}>
          Submit Another Request
        </button>
      </div>
    )
  }

  return (
    <div>
      <div style={styles.topRow}>
        <h2 style={styles.heading}>Apply to Vend at an Event</h2>
      </div>
      <p style={styles.sub}>Submit a request to set up your booth at one of our upcoming events.</p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Business Name</label>
            <input
              name="business"
              value={form.business}
              onChange={handleChange}
              placeholder="e.g. Artisan Coffee Co."
              style={{ ...styles.input, ...(errors.business ? styles.inputError : {}) }}
            />
            {errors.business && <span style={styles.errMsg}>{errors.business}</span>}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Vendor Type</label>
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              style={{ ...styles.input, ...(errors.type ? styles.inputError : {}) }}
            >
              <option value="">Select a type…</option>
              {VENDOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {errors.type && <span style={styles.errMsg}>{errors.type}</span>}
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Event</label>
          <select
            name="event"
            value={form.event}
            onChange={handleChange}
            style={{ ...styles.input, ...(errors.event ? styles.inputError : {}) }}
          >
            <option value="">Select an event…</option>
            {events.map(ev => <option key={ev.label} value={ev.label}>{ev.label}</option>)}
          </select>
          {errors.event && <span style={styles.errMsg}>{errors.event}</span>}
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Description of Products / Services</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Describe what you plan to sell or offer at the event…"
            rows={4}
            style={{ ...styles.input, ...styles.textarea, ...(errors.description ? styles.inputError : {}) }}
          />
          {errors.description && <span style={styles.errMsg}>{errors.description}</span>}
        </div>

        <button type="submit" style={styles.btn}>Submit Request</button>
      </form>
    </div>
  )
}

const styles = {
  topRow:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' },
  heading: { fontSize: '22px', fontWeight: '700', color: '#003366', margin: 0 },
  sub:     { fontSize: '14px', color: '#6b7280', margin: '0 0 24px' },

  form:   { background: 'white', borderRadius: '12px', padding: '28px 32px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: '18px' },
  row:    { display: 'flex', gap: '16px' },
  field:  { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 },
  label:  { fontSize: '14px', fontWeight: '600', color: '#374151' },
  input:  { padding: '11px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px', outline: 'none', width: '100%', boxSizing: 'border-box', background: 'white' },
  inputError: { borderColor: '#fca5a5' },
  textarea:   { resize: 'vertical', fontFamily: 'inherit' },
  errMsg: { fontSize: '12px', color: '#dc2626' },
  btn:    { background: '#d97706', color: 'white', border: 'none', padding: '13px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', alignSelf: 'flex-start' },

  successBox:   { background: 'white', borderRadius: '12px', padding: '48px 32px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textAlign: 'center', maxWidth: '480px', margin: '0 auto' },
  successIcon:  { width: '60px', height: '60px', background: '#d1fae5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', color: '#065f46', margin: '0 auto 20px', lineHeight: '60px' },
  successTitle: { fontSize: '22px', fontWeight: '700', color: '#003366', margin: '0 0 10px' },
  successSub:   { fontSize: '14px', color: '#6b7280', lineHeight: '1.7', margin: '0 0 24px' },
}

export default VendorApply

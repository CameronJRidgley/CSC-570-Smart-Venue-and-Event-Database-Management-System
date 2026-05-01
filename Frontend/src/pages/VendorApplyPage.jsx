// Author: Nicco Hill
// VendorApplyPage.jsx — Public-facing vendor application form (accessible without login).
// Collects business info, contact details, vendor type, target event, and a description.
// Validates required fields inline and shows a confirmation screen on successful submission.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const EVENTS = [
  'Spring Fest — April 15, 2026',
  'Tech Innovators Conference — May 3, 2026',
  'Local Food Truck Fiesta — May 20, 2026',
  'Summer Music Festival — June 7, 2026',
]

const VENDOR_TYPES = [
  'Food & Beverage',
  'Merchandise',
  'Equipment / Rentals',
  'Health & Beauty',
  'Arts & Crafts',
  'Other',
]

const EMPTY = { business: '', contact: '', email: '', phone: '', type: '', event: '', description: '' }

function VendorApplyPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState({})

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setErrors(er => ({ ...er, [e.target.name]: '' }))
  }

  function validate() {
    const e = {}
    if (!form.business.trim())    e.business    = 'Required'
    if (!form.contact.trim())     e.contact     = 'Required'
    if (!form.email.trim())       e.email       = 'Required'
    if (!form.type)               e.type        = 'Select a type'
    if (!form.event)              e.event       = 'Select an event'
    if (!form.description.trim()) e.description = 'Required'
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.successIcon}>✓</div>
          <h2 style={styles.successTitle}>Application Submitted!</h2>
          <p style={styles.successSub}>
            Thanks, <strong>{form.business}</strong>. Your vendor request for <strong>{form.event.split(' —')[0]}</strong> is under review.
            We'll reach out to <strong>{form.email}</strong> within 3–5 business days.
          </p>
          <div style={styles.btnRow}>
            <button style={styles.btn} onClick={() => { setForm(EMPTY); setSubmitted(false) }}>
              Submit Another
            </button>
            <button style={styles.btnOutline} onClick={() => navigate('/')}>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoRow} onClick={() => navigate('/')}>
          <span style={styles.logoText}>Smart Events</span>
        </div>

        <div style={styles.badge}>Vendor Application</div>
        <h2 style={styles.heading}>Become a Vendor</h2>
        <p style={styles.sub}>Fill out the form below and we'll review your request.</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.row}>
            <Field label="Business Name" name="business" value={form.business} onChange={handleChange} placeholder="e.g. Artisan Coffee Co." error={errors.business} />
            <Field label="Contact Name"  name="contact"  value={form.contact}  onChange={handleChange} placeholder="e.g. Jane Smith"          error={errors.contact} />
          </div>

          <div style={styles.row}>
            <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" error={errors.email} />
            <Field label="Phone (optional)" name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="(555) 000-0000" />
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Vendor Type</label>
              <select name="type" value={form.type} onChange={handleChange} style={{ ...styles.input, ...(errors.type ? styles.inputError : {}) }}>
                <option value="">Select a type…</option>
                {VENDOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.type && <span style={styles.errMsg}>{errors.type}</span>}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Event</label>
              <select name="event" value={form.event} onChange={handleChange} style={{ ...styles.input, ...(errors.event ? styles.inputError : {}) }}>
                <option value="">Select an event…</option>
                {EVENTS.map(ev => <option key={ev} value={ev}>{ev}</option>)}
              </select>
              {errors.event && <span style={styles.errMsg}>{errors.event}</span>}
            </div>
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

          <div style={styles.btnRow}>
            <button type="submit" style={styles.btn}>Submit Application</button>
            <button type="button" style={styles.btnOutline} onClick={() => navigate('/')}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, name, value, onChange, type = 'text', placeholder, error }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{ ...styles.input, ...(error ? styles.inputError : {}) }}
      />
      {error && <span style={styles.errMsg}>{error}</span>}
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #003366 0%, #004080 60%, #0066cc 100%)',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    fontFamily: 'sans-serif', padding: '40px 20px',
  },
  card: {
    background: 'white', borderRadius: '16px', padding: '48px 40px',
    maxWidth: '620px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  logoRow:  { textAlign: 'center', marginBottom: '20px', cursor: 'pointer' },
  logoText: { fontSize: '20px', fontWeight: '700', color: '#004080' },
  badge:    { display: 'inline-block', background: '#fef3c7', color: '#92400e', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '4px 12px', borderRadius: '20px', marginBottom: '12px' },
  heading:  { fontSize: '26px', fontWeight: '700', color: '#003366', margin: '0 0 6px' },
  sub:      { fontSize: '14px', color: '#6b7280', margin: '0 0 28px' },

  form:  { display: 'flex', flexDirection: 'column', gap: '18px' },
  row:   { display: 'flex', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 },
  label: { fontSize: '14px', fontWeight: '600', color: '#374151' },
  input: { padding: '11px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px', outline: 'none', width: '100%', boxSizing: 'border-box', background: 'white' },
  inputError: { borderColor: '#fca5a5' },
  textarea: { resize: 'vertical', fontFamily: 'inherit' },
  errMsg: { fontSize: '12px', color: '#dc2626' },

  btnRow:   { display: 'flex', gap: '12px', marginTop: '4px' },
  btn:      { background: '#004080', color: 'white', border: 'none', padding: '13px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' },
  btnOutline: { background: 'white', color: '#004080', border: '2px solid #004080', padding: '11px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' },

  successIcon:  { width: '64px', height: '64px', background: '#d1fae5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', color: '#065f46', margin: '0 auto 20px', lineHeight: '64px', textAlign: 'center' },
  successTitle: { fontSize: '26px', fontWeight: '700', color: '#003366', margin: '0 0 12px', textAlign: 'center' },
  successSub:   { fontSize: '15px', color: '#6b7280', lineHeight: '1.7', margin: '0 0 28px', textAlign: 'center' },
}

export default VendorApplyPage

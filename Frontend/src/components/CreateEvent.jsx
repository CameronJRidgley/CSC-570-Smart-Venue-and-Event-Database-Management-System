// Author: Nicco Hill
// CreateEvent.jsx — Form for organizers to submit a new event request.
// Collects event name, date/time, venue, city, capacity, ticket price, and description.
// On submission the event is NOT immediately published — it enters a pending state
// and must be approved by an admin before appearing in the public events listing.

import { useState, useEffect } from 'react'
import { api } from '../api'

const EMPTY = { name: '', date: '', time: '', endTime: '', venue_id: '', capacity: '', price: '', description: '' }

function CreateEvent() {
  const [form, setForm] = useState(EMPTY)
  const [submitted, setSubmitted] = useState(false)
  const [venues, setVenues] = useState([])
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [createdEvent, setCreatedEvent] = useState(null)

  useEffect(() => {
    api.listVenues()
      .then(setVenues)
      .catch(err => console.warn('Could not load venues:', err.message))
  }, [])

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const startISO = new Date(`${form.date}T${form.time}`).toISOString()
      // Default to a 4-hour event if no end time provided
      const endStr = form.endTime || form.time
      const endDate = new Date(`${form.date}T${endStr}`)
      if (!form.endTime) endDate.setHours(endDate.getHours() + 4)
      const endISO = endDate.toISOString()

      const payload = {
        name: form.name,
        description: form.description || null,
        venue_id: Number(form.venue_id),
        starts_at: startISO,
        ends_at: endISO,
        capacity: Number(form.capacity),
        ticket_price: form.price === '' ? null : Number(form.price),
        status: 'draft',
      }
      const created = await api.createEvent(payload)
      setCreatedEvent(created)
      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Failed to create event')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    const venueName = venues.find(v => v.id === createdEvent?.venue_id)?.name || 'venue'
    return (
      <div style={styles.successBox}>
        <div style={styles.pendingIcon}>⏳</div>
        <span style={styles.pendingBadge}>Pending Admin Approval</span>
        <h2 style={styles.successTitle}>Request Submitted!</h2>
        <p style={styles.successSub}>
          <strong>{form.name}</strong> on {form.date} at {venueName} has been created (id #{createdEvent?.id})
          and saved to the database. It will appear on the events page once approved.
        </p>
        <button style={styles.btn} onClick={() => { setForm(EMPTY); setSubmitted(false); setCreatedEvent(null) }}>
          Submit Another Event
        </button>
      </div>
    )
  }

  return (
    <div>
      <h2 style={styles.heading}>Create New Event</h2>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.row}>
          <Field label="Event Name" name="name" value={form.name} onChange={handleChange} placeholder="e.g. Summer Jazz Night" required full />
        </div>

        <div style={styles.row}>
          <Field label="Date" name="date" type="date" value={form.date} onChange={handleChange} required />
          <Field label="Start Time" name="time" type="time" value={form.time} onChange={handleChange} required />
          <Field label="End Time" name="endTime" type="time" value={form.endTime} onChange={handleChange} />
        </div>

        <div style={styles.fieldFull}>
          <label style={styles.label}>Venue</label>
          <select name="venue_id" value={form.venue_id} onChange={handleChange} required style={styles.input}>
            <option value="">— Select a venue —</option>
            {venues.map(v => (
              <option key={v.id} value={v.id}>{v.name} ({v.city}) — capacity {v.total_capacity}</option>
            ))}
          </select>
          {venues.length === 0 && (
            <small style={{ color: '#92400e' }}>No venues found. Ask an admin to add one before creating events.</small>
          )}
        </div>

        <div style={styles.row}>
          <Field label="Capacity" name="capacity" type="number" value={form.capacity} onChange={handleChange} placeholder="e.g. 500" min="1" required />
          <Field label="Ticket Price ($)" name="price" type="number" value={form.price} onChange={handleChange} placeholder="e.g. 45" min="0" step="0.01" />
        </div>

        <div style={styles.fieldFull}>
          <label style={styles.label}>Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Tell attendees what to expect…"
            rows={4}
            style={styles.textarea}
          />
        </div>

        <button type="submit" style={styles.btn} disabled={submitting}>
          {submitting ? 'Creating…' : 'Create Event'}
        </button>
      </form>
    </div>
  )
}

function Field({ label, name, value, onChange, type = 'text', placeholder, required, min, step, full }) {
  return (
    <div style={full ? styles.fieldFull : styles.field}>
      <label style={styles.label}>{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        min={min}
        step={step}
        style={styles.input}
      />
    </div>
  )
}

const styles = {
  heading: { fontSize: '22px', fontWeight: '700', color: '#003366', margin: '0 0 24px' },
  form: { background: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: '20px' },
  row: { display: 'flex', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 },
  fieldFull: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '14px', fontWeight: '600', color: '#374151' },
  input: { padding: '11px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  textarea: { padding: '11px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' },
  btn: { background: '#004080', color: 'white', border: 'none', padding: '14px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', alignSelf: 'flex-start' },
  successBox:   { background: 'white', borderRadius: '12px', padding: '48px 32px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textAlign: 'center', maxWidth: '480px', margin: '0 auto' },
  pendingIcon:  { fontSize: '48px', marginBottom: '12px' },
  pendingBadge: { display: 'inline-block', background: '#fef3c7', color: '#92400e', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '4px 14px', borderRadius: '20px', marginBottom: '16px' },
  successTitle: { fontSize: '24px', fontWeight: '700', color: '#003366', margin: '0 0 10px' },
  successSub:   { fontSize: '15px', color: '#6b7280', margin: '0 0 28px', lineHeight: '1.6' },
}

export default CreateEvent

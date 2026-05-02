// Author: Cameron Ridgley
// Copilot had helped me work through bugs and things to sharp up this file
// IncidentReport.jsx — Security/staff form for filing incidents.
// Writes to SQL `incidents` and Mongo `incidents` (timeline) via the backend.
import { useEffect, useState } from 'react'
import { api } from '../api'

const CATEGORIES = ['medical', 'security', 'crowd', 'technical', 'fire', 'other']
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical']

export default function IncidentReport() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const [events, setEvents]   = useState([])
  const [eventId, setEventId] = useState('')
  const [form, setForm]       = useState({
    title: '', description: '', location: '', category: 'security', severity: 'Low',
  })
  const [recent, setRecent]   = useState([])
  const [status, setStatus]   = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.listEvents().then(setEvents).catch(() => setEvents([]))
  }, [])

  useEffect(() => {
    if (!eventId) { setRecent([]); return }
    api.getEventIncidents(eventId).then(setRecent).catch(() => setRecent([]))
  }, [eventId, status])

  function field(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!eventId)        { setStatus({ kind:'err', msg:'Pick an event first.' }); return }
    if (!form.title)     { setStatus({ kind:'err', msg:'Title is required.' });  return }
    if (!form.description){ setStatus({ kind:'err', msg:'Describe what happened.' }); return }

    setLoading(true)
    setStatus(null)
    try {
      await api.createIncident({
        event_id:          Number(eventId),
        title:             form.title,
        description:       form.description,
        location:          form.location || null,
        category:          form.category,
        severity:          form.severity,
        reporter_staff_id: user.id ?? 1,
      })
      setStatus({ kind: 'ok', msg: 'Incident filed. Timeline updated in MongoDB.' })
      setForm({ title:'', description:'', location:'', category:'security', severity:'Low' })
    } catch (err) {
      setStatus({ kind: 'err', msg: err.message || 'Could not file incident.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <h2 style={{ marginTop: 0 }}>File an Incident</h2>
      <p style={{ color: '#555', marginTop: 4 }}>
        Logs to SQL <code>incidents</code> for the official record and to MongoDB
        <code> incidents</code> timeline for an append-only audit trail.
      </p>

      <form onSubmit={handleSubmit} style={card}>
        <label style={lbl}>Event</label>
        <select value={eventId} onChange={e => setEventId(e.target.value)} style={inp}>
          <option value="">— Choose an event —</option>
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>{ev.name}</option>
          ))}
        </select>

        <label style={lbl}>Title</label>
        <input value={form.title} onChange={field('title')} maxLength={200} style={inp}
               placeholder="Brief summary (e.g. 'Crowd surge at main gate')" />

        <label style={lbl}>Description</label>
        <textarea value={form.description} onChange={field('description')} rows={4}
                  style={{ ...inp, resize: 'vertical' }}
                  placeholder="What happened, who was involved, what action was taken so far" />

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Category</label>
            <select value={form.category} onChange={field('category')} style={inp}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Severity</label>
            <select value={form.severity} onChange={field('severity')} style={inp}>
              {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <label style={lbl}>Location</label>
        <input value={form.location} onChange={field('location')} style={inp}
               placeholder="e.g. North entrance, Gate B" />

        <button type="submit" disabled={loading} style={btn}>
          {loading ? 'Filing…' : 'File Incident'}
        </button>

        {status && (
          <div style={{
            marginTop: 12, padding: 10, borderRadius: 6,
            background: status.kind === 'ok' ? '#dcfce7' : '#fee2e2',
            color:      status.kind === 'ok' ? '#166534' : '#991b1b',
          }}>{status.msg}</div>
        )}
      </form>

      {eventId && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 8 }}>Open / recent incidents for this event</h3>
          {recent.length === 0
            ? <p style={{ color: '#888' }}>No incidents on file.</p>
            : recent.map(i => (
                <div key={i.id} style={{ ...item, borderLeft: `4px solid ${sevColor(i.severity)}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{i.title}</strong>
                    <span style={{ fontSize: 12, color: '#555' }}>
                      {i.severity} · {i.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#555' }}>
                    #{i.id} · {i.category}
                  </div>
                </div>
            ))
          }
        </div>
      )}
    </div>
  )
}

function sevColor(s) {
  return ({ Low:'#10b981', Medium:'#f59e0b', High:'#ef4444', Critical:'#7f1d1d' })[s] || '#9ca3af'
}

const card = { background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #e5e7eb' }
const lbl  = { display: 'block', fontWeight: 600, marginBottom: 4, marginTop: 10 }
const inp  = { width: '100%', padding: 10, border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 8, boxSizing: 'border-box' }
const btn  = { marginTop: 12, padding: '10px 18px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }
const item = { background: '#fff', padding: 12, borderRadius: 6, border: '1px solid #e5e7eb', marginBottom: 8 }

// Author: Cameron Ridgley
// Copilot had helped me work through bugs and things to sharp up this file
// EventFeedback.jsx — Attendee post-event feedback form (writes to Mongo `feedback`).
import { useEffect, useState } from 'react'
import { api } from '../api'

export default function EventFeedback() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const [events, setEvents]     = useState([])
  const [eventId, setEventId]   = useState('')
  const [rating, setRating]     = useState(5)
  const [comments, setComments] = useState('')
  const [tagText, setTagText]   = useState('')
  const [recent, setRecent]     = useState([])
  const [status, setStatus]     = useState(null)   // {kind:'ok'|'err', msg}
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    api.listEvents().then(setEvents).catch(() => setEvents([]))
  }, [])

  useEffect(() => {
    if (!eventId) { setRecent([]); return }
    api.listEventFeedback(eventId).then(setRecent).catch(() => setRecent([]))
  }, [eventId])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!eventId) { setStatus({ kind: 'err', msg: 'Pick an event first.' }); return }
    setLoading(true)
    setStatus(null)
    try {
      const tags = tagText.split(',').map(t => t.trim()).filter(Boolean)
      await api.submitFeedback({
        event_id:     Number(eventId),
        attendee_id:  user.id ?? null,
        rating:       Number(rating),
        comments:     comments || null,
        tags,
      })
      setStatus({ kind: 'ok', msg: 'Thanks for the feedback!' })
      setComments('')
      setTagText('')
      const fresh = await api.listEventFeedback(eventId)
      setRecent(fresh)
    } catch (err) {
      setStatus({ kind: 'err', msg: err.message || 'Could not submit feedback.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h2 style={{ marginTop: 0 }}>Event Feedback</h2>
      <p style={{ color: '#555', marginTop: 4 }}>
        Tell organizers how it went. Stored in MongoDB so the survey can grow over time.
      </p>

      <form onSubmit={handleSubmit} style={card}>
        <label style={lbl}>Event</label>
        <select value={eventId} onChange={e => setEventId(e.target.value)} style={inp}>
          <option value="">— Choose an event —</option>
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>{ev.name}</option>
          ))}
        </select>

        <label style={lbl}>Rating</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {[1,2,3,4,5].map(n => (
            <button
              type="button"
              key={n}
              onClick={() => setRating(n)}
              style={{
                ...starBtn,
                color: n <= rating ? '#f59e0b' : '#cbd5e1',
              }}
              aria-label={`${n} stars`}
            >★</button>
          ))}
          <span style={{ alignSelf: 'center', color: '#555' }}>{rating} / 5</span>
        </div>

        <label style={lbl}>Comments</label>
        <textarea
          value={comments}
          onChange={e => setComments(e.target.value)}
          rows={4}
          placeholder="What worked? What could be better?"
          style={{ ...inp, resize: 'vertical' }}
        />

        <label style={lbl}>Tags (comma-separated)</label>
        <input
          value={tagText}
          onChange={e => setTagText(e.target.value)}
          placeholder="food, sound, parking"
          style={inp}
        />

        <button type="submit" disabled={loading} style={btn}>
          {loading ? 'Submitting…' : 'Submit Feedback'}
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
          <h3 style={{ marginBottom: 8 }}>Recent feedback for this event</h3>
          {recent.length === 0
            ? <p style={{ color: '#888' }}>No feedback yet — be the first.</p>
            : recent.map(f => (
                <div key={f.id} style={item}>
                  <div style={{ fontWeight: 600 }}>
                    {'★'.repeat(f.rating)}<span style={{ color: '#cbd5e1' }}>{'★'.repeat(5 - f.rating)}</span>
                    <span style={{ marginLeft: 10, fontWeight: 400, color: '#666', fontSize: 13 }}>
                      {new Date(f.submitted_at).toLocaleString()}
                    </span>
                  </div>
                  {f.comments && <p style={{ margin: '6px 0 4px' }}>{f.comments}</p>}
                  {f.tags?.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {f.tags.map(t => (
                        <span key={t} style={tag}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
            ))
          }
        </div>
      )}
    </div>
  )
}

const card = { background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #e5e7eb' }
const lbl  = { display: 'block', fontWeight: 600, marginBottom: 4, marginTop: 10 }
const inp  = { width: '100%', padding: 10, border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 8, boxSizing: 'border-box' }
const btn  = { marginTop: 12, padding: '10px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }
const starBtn = { background: 'none', border: 'none', fontSize: 28, cursor: 'pointer', padding: 0 }
const item = { background: '#fff', padding: 12, borderRadius: 6, border: '1px solid #e5e7eb', marginBottom: 8 }
const tag  = { background: '#eff6ff', color: '#1e40af', padding: '2px 8px', borderRadius: 999, fontSize: 12 }

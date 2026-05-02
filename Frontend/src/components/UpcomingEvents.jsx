// Author: Nicco Hill, Cameron Ridgley
// Copilot had helped me work through bugs and things to sharp up this file
// UpcomingEvents.jsx — Attendee-facing event browser.
// Features: text + date search filtering, vendor pill previews per event,
// expandable "More Analytics" panel (ticket breakdown, capacity bar, full vendor list),
// and a Sold Out state that disables ticket purchase when capacity is reached.

import { useState, useMemo, useEffect } from 'react'
import { api } from '../api'

// Adapter: backend EventRead -> shape this component renders.
function adaptEvent(e) {
  const start = new Date(e.starts_at)
  const end   = new Date(e.ends_at)
  return {
    id: e.id,
    name: e.name,
    type: e.type || 'Event',
    date: start.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
    isoDate: start.toISOString().slice(0, 10),
    time: `${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
    venue: e.venue_name || `Venue #${e.venue_id}`,
    city: e.city || '',
    capacity: e.capacity ?? 0,
    spotsLeft: e.spots_left ?? e.capacity ?? 0,
    price: e.price ?? 0,
    vendors: e.vendors || [],
    analytics: e.analytics || { vip: 0, general: 0, peakHour: '—', avgAge: 0 },
  }
}

const mockEvents = [
  {
    id: 1,
    name: 'Spring Fest',
    type: 'Concert',
    date: 'April 15, 2026',
    isoDate: '2026-04-15',
    time: '6:00 PM – 10:00 PM',
    venue: 'Hampton Coliseum',
    city: 'Hampton, VA',
    capacity: 5000,
    spotsLeft: 1200,
    price: 99.99,
    vendors: [
      { name: 'Artisan Coffee Co.',  type: 'Food & Beverage', booth: 'B-14' },
      { name: 'Sound Merch Shop',    type: 'Merchandise',     booth: 'B-07' },
      { name: 'Vista Photography',   type: 'Services',        booth: 'B-22' },
    ],
    analytics: { vip: 800, general: 3000, peakHour: '8:00 PM', avgAge: 26 },
  },
  {
    id: 2,
    name: 'Tech Innovators Conference',
    type: 'Conference',
    date: 'May 3, 2026',
    isoDate: '2026-05-03',
    time: '9:00 AM – 5:00 PM',
    venue: 'Convention Center',
    city: 'Norfolk, VA',
    capacity: 800,
    spotsLeft: 340,
    price: 149.00,
    vendors: [
      { name: 'DevGear Store',     type: 'Merchandise',     booth: 'A-03' },
      { name: 'Bean & Byte Café',  type: 'Food & Beverage', booth: 'A-11' },
    ],
    analytics: { vip: 200, general: 260, peakHour: '11:00 AM', avgAge: 33 },
  },
  {
    id: 3,
    name: 'Local Food Truck Fiesta',
    type: 'Festival',
    date: 'May 20, 2026',
    isoDate: '2026-05-20',
    time: '11:00 AM – 8:00 PM',
    venue: 'Town Square Park',
    city: 'Virginia Beach, VA',
    capacity: 2000,
    spotsLeft: 1800,
    price: 15.00,
    vendors: [
      { name: 'Smoky BBQ Truck',    type: 'Food & Beverage', booth: 'F-01' },
      { name: 'Island Bites',       type: 'Food & Beverage', booth: 'F-02' },
      { name: 'Craft Lemonade Co.', type: 'Food & Beverage', booth: 'F-05' },
      { name: 'Handmade Goods',     type: 'Merchandise',     booth: 'F-09' },
    ],
    analytics: { vip: 0, general: 200, peakHour: '1:00 PM', avgAge: 31 },
  },
  {
    id: 4,
    name: 'Summer Music Festival',
    type: 'Concert',
    date: 'June 7, 2026',
    isoDate: '2026-06-07',
    time: '4:00 PM – 11:00 PM',
    venue: 'Amphitheater',
    city: 'Richmond, VA',
    capacity: 10000,
    spotsLeft: 4500,
    price: 75.00,
    vendors: [
      { name: 'Festival Eats',      type: 'Food & Beverage', booth: 'C-01' },
      { name: 'Summer Apparel',     type: 'Merchandise',     booth: 'C-14' },
      { name: 'Chill Beverages',    type: 'Food & Beverage', booth: 'C-03' },
      { name: 'Photo Booth Pros',   type: 'Services',        booth: 'C-20' },
    ],
    analytics: { vip: 1500, general: 4000, peakHour: '9:00 PM', avgAge: 24 },
  },
  {
    id: 5,
    name: 'Jazz Under the Stars',
    type: 'Concert',
    date: 'May 10, 2026',
    isoDate: '2026-05-10',
    time: '7:00 PM – 11:00 PM',
    venue: 'Waterfront Park',
    city: 'Chesapeake, VA',
    capacity: 1200,
    spotsLeft: 0,
    price: 55.00,
    vendors: [
      { name: 'Night Bites Co.',    type: 'Food & Beverage', booth: 'D-01' },
      { name: 'Jazz Merch Stand',   type: 'Merchandise',     booth: 'D-04' },
    ],
    analytics: { vip: 300, general: 900, peakHour: '9:00 PM', avgAge: 38 },
  },
]

const typeColors = {
  Concert:    { bg: '#e8f0fe', text: '#1a56db' },
  Conference: { bg: '#fef3c7', text: '#92400e' },
  Festival:   { bg: '#d1fae5', text: '#065f46' },
}

const vendorTypeColors = {
  'Food & Beverage': { bg: '#fef3c7', text: '#92400e' },
  'Merchandise':     { bg: '#e8f0fe', text: '#1a56db' },
  'Services':        { bg: '#ede9fe', text: '#5b21b6' },
}

function EventCard({ event, onBuy, owned }) {
  const [expanded, setExpanded] = useState(false)
  const tag       = typeColors[event.type] || { bg: '#f3f4f6', text: '#374151' }
  const isFull    = event.spotsLeft === 0
  const soldPct   = isFull ? 100 : Math.round(((event.capacity - event.spotsLeft) / event.capacity) * 100)
  const totalSold = event.capacity - event.spotsLeft

  return (
    <div style={{ ...styles.card, ...(isFull ? styles.cardFull : {}) }}>
      <div style={styles.cardTop}>
        <div>
          <div style={styles.tagRow}>
            <span style={{ ...styles.typeTag, background: tag.bg, color: tag.text }}>
              {event.type}
            </span>
            {isFull && <span style={styles.soldOutBadge}>Sold Out</span>}
          </div>
          <h3 style={styles.eventName}>{event.name}</h3>
          <p style={styles.meta}>{event.date} &nbsp;·&nbsp; {event.time}</p>
          <p style={styles.meta}>{event.venue} — {event.city}</p>
        </div>
        <div style={styles.priceBlock}>
          <span style={{ ...styles.price, ...(isFull ? styles.priceDisabled : {}) }}>
            ${event.price.toFixed(2)}
          </span>
          <span style={styles.priceLabel}>per ticket</span>
        </div>
      </div>

      {/* Vendor pills */}
      {event.vendors.length > 0 && (
        <div style={styles.vendorRow}>
          <span style={styles.vendorRowLabel}>Vendors:</span>
          {event.vendors.slice(0, 3).map(v => (
            <span key={v.name} style={styles.vendorPill}>{v.name}</span>
          ))}
          {event.vendors.length > 3 && (
            <span style={styles.vendorMore}>+{event.vendors.length - 3} more</span>
          )}
        </div>
      )}

      <div style={styles.cardBottom}>
        <div style={styles.capacityWrap}>
          <div style={styles.capacityBar}>
            <div style={{ ...styles.capacityFill, width: `${soldPct}%`, background: isFull ? '#dc2626' : soldPct >= 90 ? '#f59e0b' : '#004080' }} />
          </div>
          <span style={{ ...styles.capacityText, ...(isFull ? styles.capacityTextFull : {}) }}>
            {isFull ? 'Event is full — no tickets available' : `${event.spotsLeft.toLocaleString()} spots left`}
          </span>
        </div>
        <div style={styles.actionRow}>
          <button style={styles.analyticsBtn} onClick={() => setExpanded(x => !x)}>
            {expanded ? 'Hide Analytics ▲' : 'More Analytics ▼'}
          </button>
          {owned ? (
            <button style={styles.buyBtnOwned} disabled>Ticket Purchased ✓</button>
          ) : (
            <button style={isFull ? styles.buyBtnDisabled : styles.buyBtn} disabled={isFull} onClick={() => onBuy && onBuy(event)}>
              {isFull ? 'Sold Out' : 'Buy Ticket'}
            </button>
          )}
        </div>
      </div>

      {/* Analytics panel */}
      {expanded && (
        <div style={styles.analyticsPanel}>
          {/* Ticket breakdown */}
          <div style={styles.analyticsGrid}>
            <div style={styles.analyticsStat}>
              <div style={styles.analyticsLabel}>Tickets Sold</div>
              <div style={styles.analyticsValue}>{totalSold.toLocaleString()}</div>
            </div>
            {event.analytics.vip > 0 && (
              <div style={styles.analyticsStat}>
                <div style={styles.analyticsLabel}>VIP</div>
                <div style={{ ...styles.analyticsValue, color: '#5b21b6' }}>{event.analytics.vip.toLocaleString()}</div>
              </div>
            )}
            <div style={styles.analyticsStat}>
              <div style={styles.analyticsLabel}>General</div>
              <div style={{ ...styles.analyticsValue, color: '#004080' }}>{event.analytics.general.toLocaleString()}</div>
            </div>
            <div style={styles.analyticsStat}>
              <div style={styles.analyticsLabel}>Peak Hour</div>
              <div style={styles.analyticsValue}>{event.analytics.peakHour}</div>
            </div>
            <div style={styles.analyticsStat}>
              <div style={styles.analyticsLabel}>Avg. Age</div>
              <div style={styles.analyticsValue}>{event.analytics.avgAge}</div>
            </div>
            <div style={styles.analyticsStat}>
              <div style={styles.analyticsLabel}>Revenue</div>
              <div style={{ ...styles.analyticsValue, color: '#065f46' }}>
                ${(totalSold * event.price).toLocaleString('en-US', { minimumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          {/* Capacity bar breakdown */}
          <div style={styles.barSection}>
            <div style={styles.barSectionLabel}>Capacity — {soldPct}% filled</div>
            <div style={styles.bigBarBg}>
              <div style={{ ...styles.bigBarFill, width: `${soldPct}%`, background: soldPct >= 90 ? '#f59e0b' : '#004080' }} />
            </div>
          </div>

          {/* Vendor list */}
          <div style={styles.vendorSection}>
            <div style={styles.vendorSectionTitle}>
              Vendors at this event
              <span style={styles.vendorCount}>{event.vendors.length} confirmed</span>
            </div>
            <div style={styles.vendorList}>
              {event.vendors.map(v => {
                const vc = vendorTypeColors[v.type] || { bg: '#f3f4f6', text: '#374151' }
                return (
                  <div key={v.name} style={styles.vendorCard}>
                    <div style={styles.vendorName}>{v.name}</div>
                    <div style={styles.vendorMeta}>
                      <span style={{ ...styles.vendorTypeBadge, background: vc.bg, color: vc.text }}>{v.type}</span>
                      <span style={styles.vendorBooth}>Booth {v.booth}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function UpcomingEvents() {
  const [query, setQuery] = useState('')
  const [date, setDate]   = useState('')
  const [events, setEvents] = useState(mockEvents)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [buyEvent, setBuyEvent] = useState(null)   // event being purchased
  const [ownedIds, setOwnedIds] = useState(() => new Set())

  // Load tickets the current user already owns so we can hide "Buy" for those events.
  async function refreshOwned() {
    try {
      const me = await api.me().catch(() => null)
      if (!me?.id) { setOwnedIds(new Set()); return }
      const rows = await api.getUserTickets(me.id).catch(() => [])
      const active = (rows || []).filter(t => t.status !== 'cancelled' && t.status !== 'refunded')
      setOwnedIds(new Set(active.map(t => t.event_id)))
    } catch { setOwnedIds(new Set()) }
  }

  useEffect(() => {
    let cancelled = false
    api.listEvents()
      .then(rows => {
        if (cancelled) return
        const adapted = (rows || []).map(adaptEvent)
        // Use API data if any, otherwise keep mocks for demo continuity.
        setEvents(adapted.length ? adapted : mockEvents)
        setError(null)
      })
      .catch(err => {
        if (cancelled) return
        console.warn('Falling back to mock events:', err.message)
        setError(err.message)
        setEvents(mockEvents)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    refreshOwned()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return events.filter(e => {
      const matchesText = !q ||
        e.name.toLowerCase().includes(q) ||
        e.city.toLowerCase().includes(q) ||
        e.venue.toLowerCase().includes(q)
      const matchesDate = !date || e.isoDate >= date
      return matchesText && matchesDate
    })
  }, [query, date, events])

  return (
    <div>
      <h2 style={styles.heading}>Upcoming Events</h2>
      {loading && <p style={{ color: '#6b7280', margin: '0 0 12px' }}>Loading events…</p>}
      {error && !loading && (
        <p style={{ color: '#92400e', background: '#fef3c7', padding: '8px 12px', borderRadius: 8, margin: '0 0 12px' }}>
          Showing demo data — backend unreachable ({error})
        </p>
      )}

      <div style={styles.searchBar}>
        <div style={styles.searchField}>
          <label style={styles.searchLabel}>Event or City</label>
          <input
            type="text"
            placeholder="e.g. Spring Fest, Norfolk…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <div style={styles.divider} />
        <div style={styles.searchField}>
          <label style={styles.searchLabel}>Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        {(query || date) && (
          <button style={styles.clearBtn} onClick={() => { setQuery(''); setDate('') }}>Clear</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyText}>No events match your search.</p>
          <button style={styles.clearBtn} onClick={() => { setQuery(''); setDate('') }}>Clear filters</button>
        </div>
      ) : (
        <>
          {(query || date) && (
            <p style={styles.resultCount}>{filtered.length} event{filtered.length !== 1 ? 's' : ''} found</p>
          )}
          <div style={styles.list}>
            {filtered.map(e => <EventCard key={e.id} event={e} onBuy={setBuyEvent} owned={ownedIds.has(e.id)} />)}
          </div>
        </>
      )}
      {buyEvent && (
        <PaymentModal
          event={buyEvent}
          onClose={() => setBuyEvent(null)}
          onSuccess={() => {
            setBuyEvent(null)
            // Refresh events so spots-left counters update, plus owned list.
            api.listEvents().then(rows => {
              const adapted = (rows || []).map(adaptEvent)
              if (adapted.length) setEvents(adapted)
            }).catch(() => {})
            refreshOwned()
          }}
        />
      )}    </div>
  )
}

// Mock payment modal: collects fake card info, calls api.purchaseTicket(),
// then either confirms success (saving ticket to SQL) or shows the error.
function PaymentModal({ event, onClose, onSuccess }) {
  const [name,    setName]    = useState('')
  const [card,    setCard]    = useState('4242 4242 4242 4242')
  const [exp,     setExp]     = useState('12/28')
  const [cvc,     setCvc]     = useState('123')
  const [busy,    setBusy]    = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(null)

  const me = (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
  })()

  const validCard = card.replace(/\s/g, '').length >= 12 && /^\d{2}\/\d{2}$/.test(exp) && cvc.length >= 3

  async function handlePay(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const seats = await api.getEventSeats(event.id).catch(() => [])
      const seat  = seats[0]
      if (!seat) throw new Error('No seats configured for this event')

      const attendee = {
        full_name: name || me?.full_name || me?.email?.split('@')[0] || 'Guest',
        email:     me?.email || `guest_${Date.now()}@example.com`,
      }

      const resp = await api.purchaseTicket({
        event_id:       event.id,
        seat_id:        seat.id,
        attendee,
        payment_method: 'card',
      })
      setSuccess(resp.ticket)
    } catch (err) {
      setError(err.message || 'Payment failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
        {success ? (
          <div style={styles.modalSuccess}>
            <div style={styles.modalCheck}>✓</div>
            <h3 style={styles.modalTitle}>Payment confirmed</h3>
            <p style={styles.modalSub}>
              Ticket #{success.id} added to your wallet.<br/>
              View it under <strong>My Tickets</strong>.
            </p>
            <div style={styles.modalActions}>
              <button style={styles.modalPay} onClick={onSuccess}>Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePay}>
            <h3 style={styles.modalTitle}>Checkout</h3>
            <p style={styles.modalSub}>{event.name} — {event.date}</p>
            {error && <div style={styles.modalError}>{error}</div>}
            <div style={styles.modalSummary}>
              <div>{event.venue}</div>
              <div style={{ color: '#6b7280', marginTop: 4 }}>1× General Admission</div>
              <div style={styles.modalTotal}>
                <span>Total</span>
                <span>${event.price.toFixed(2)}</span>
              </div>
            </div>
            <div style={styles.modalField}>
              <label style={styles.modalLabel}>Name on card</label>
              <input style={styles.modalInput} value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" required />
            </div>
            <div style={styles.modalField}>
              <label style={styles.modalLabel}>Card number</label>
              <input style={styles.modalInput} value={card} onChange={e => setCard(e.target.value)} placeholder="4242 4242 4242 4242" required />
            </div>
            <div style={styles.modalRow}>
              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Expiry</label>
                <input style={styles.modalInput} value={exp} onChange={e => setExp(e.target.value)} placeholder="MM/YY" required />
              </div>
              <div style={styles.modalField}>
                <label style={styles.modalLabel}>CVC</label>
                <input style={styles.modalInput} value={cvc} onChange={e => setCvc(e.target.value)} placeholder="123" required />
              </div>
            </div>
            <div style={styles.modalActions}>
              <button type="button" style={styles.modalCancel} onClick={onClose} disabled={busy}>Cancel</button>
              <button type="submit" style={(busy || !validCard) ? styles.modalPayDis : styles.modalPay} disabled={busy || !validCard}>
                {busy ? 'Processing…' : `Pay $${event.price.toFixed(2)}`}
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 12, textAlign: 'center' }}>
              Demo mode — no real charge. Any card details accepted.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

const styles = {
  heading: { fontSize: '20px', fontWeight: '700', color: '#003366', margin: '0 0 20px' },

  // Payment modal
  modalBackdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' },
  modalCard:     { background: 'white', borderRadius: '14px', maxWidth: '460px', width: '100%', padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  modalTitle:    { fontSize: '20px', fontWeight: '700', color: '#003366', margin: '0 0 4px' },
  modalSub:      { fontSize: '13px', color: '#6b7280', margin: '0 0 20px' },
  modalRow:      { display: 'flex', gap: '10px' },
  modalField:    { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, marginBottom: '14px' },
  modalLabel:    { fontSize: '13px', fontWeight: '600', color: '#374151' },
  modalInput:    { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none' },
  modalSummary:  { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px', color: '#374151' },
  modalTotal:    { display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '700', color: '#111', marginTop: '8px', borderTop: '1px solid #e5e7eb', paddingTop: '8px' },
  modalActions:  { display: 'flex', gap: '10px', marginTop: '8px' },
  modalCancel:   { flex: 1, background: 'white', color: '#374151', border: '1px solid #d1d5db', padding: '11px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  modalPay:      { flex: 2, background: '#004080', color: 'white', border: 'none', padding: '11px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  modalPayDis:   { flex: 2, background: '#9ca3af', color: 'white', border: 'none', padding: '11px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'not-allowed' },
  modalError:    { background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', marginBottom: '12px' },
  modalSuccess:  { textAlign: 'center', padding: '20px 0' },
  modalCheck:    { fontSize: '48px', marginBottom: '12px' },

  searchBar: {
    display: 'flex', alignItems: 'center', background: 'white',
    border: '1px solid #e5e7eb', borderRadius: '12px', padding: '12px 20px',
    marginBottom: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    flexWrap: 'wrap', gap: '8px',
  },
  searchField: { display: 'flex', flexDirection: 'column', flex: 1, minWidth: '160px' },
  searchLabel: { fontSize: '11px', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' },
  searchInput: { border: 'none', outline: 'none', fontSize: '15px', color: '#111', background: 'transparent', padding: '2px 0' },
  divider:     { width: '1px', height: '36px', background: '#e5e7eb', margin: '0 16px', alignSelf: 'center' },
  clearBtn:    { background: 'none', border: '1px solid #d1d5db', color: '#6b7280', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap', alignSelf: 'center' },
  resultCount: { fontSize: '13px', color: '#6b7280', margin: '0 0 16px' },
  empty:       { textAlign: 'center', padding: '48px 0' },
  emptyText:   { fontSize: '16px', color: '#6b7280', marginBottom: '16px' },

  list: { display: 'flex', flexDirection: 'column', gap: '16px' },

  card:     { background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  cardFull: { border: '1px solid #fca5a5', background: '#fffafa' },
  cardTop:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' },
  tagRow:   { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' },
  typeTag:  { display: 'inline-block', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '3px 10px', borderRadius: '20px' },
  soldOutBadge: { display: 'inline-block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '3px 10px', borderRadius: '20px', background: '#fee2e2', color: '#dc2626' },
  eventName: { fontSize: '18px', fontWeight: '700', color: '#111', margin: '0 0 6px' },
  meta:      { fontSize: '14px', color: '#666', margin: '2px 0' },
  priceBlock:   { textAlign: 'right', flexShrink: 0, marginLeft: '16px' },
  price:        { display: 'block', fontSize: '22px', fontWeight: '700', color: '#004080' },
  priceDisabled:{ color: '#9ca3af' },
  priceLabel:   { fontSize: '12px', color: '#999' },

  vendorRow:      { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' },
  vendorRowLabel: { fontSize: '12px', fontWeight: '600', color: '#9ca3af' },
  vendorPill:     { fontSize: '12px', background: '#f3f4f6', color: '#374151', padding: '3px 10px', borderRadius: '20px', fontWeight: '500' },
  vendorMore:     { fontSize: '12px', color: '#9ca3af' },

  cardBottom: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' },
  capacityWrap: { flex: 1, minWidth: '120px' },
  capacityBar:  { height: '6px', background: '#e5e7eb', borderRadius: '99px', overflow: 'hidden', marginBottom: '6px' },
  capacityFill: { height: '100%', background: '#004080', borderRadius: '99px' },
  capacityText:     { fontSize: '12px', color: '#666' },
  capacityTextFull: { color: '#dc2626', fontWeight: '600' },
  actionRow:    { display: 'flex', gap: '8px', flexShrink: 0 },
  analyticsBtn: { background: 'white', color: '#004080', border: '1px solid #004080', padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' },
  buyBtn:         { background: '#004080', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' },
  buyBtnDisabled: { background: '#e5e7eb', color: '#9ca3af', border: 'none', padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'not-allowed', whiteSpace: 'nowrap' },
  buyBtnOwned:    { background: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0', padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'default', whiteSpace: 'nowrap' },

  // Analytics panel
  analyticsPanel: { marginTop: '20px', borderTop: '1px solid #e5e7eb', paddingTop: '20px' },
  analyticsGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px', marginBottom: '16px' },
  analyticsStat:  { background: '#f9fafb', borderRadius: '8px', padding: '12px 14px' },
  analyticsLabel: { fontSize: '11px', color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' },
  analyticsValue: { fontSize: '18px', fontWeight: '700', color: '#111' },

  barSection:      { marginBottom: '20px' },
  barSectionLabel: { fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' },
  bigBarBg:        { height: '10px', background: '#e5e7eb', borderRadius: '99px', overflow: 'hidden' },
  bigBarFill:      { height: '100%', borderRadius: '99px', transition: 'width 0.3s' },

  vendorSection:      { },
  vendorSectionTitle: { fontSize: '14px', fontWeight: '700', color: '#374151', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' },
  vendorCount:        { fontSize: '12px', background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: '20px', fontWeight: '600' },
  vendorList:         { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' },
  vendorCard:         { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px' },
  vendorName:         { fontSize: '13px', fontWeight: '600', color: '#111', marginBottom: '4px' },
  vendorMeta:         { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' },
  vendorTypeBadge:    { fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' },
  vendorBooth:        { fontSize: '11px', color: '#9ca3af' },
}

export default UpcomingEvents

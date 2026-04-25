import { useState, useMemo } from 'react'

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
  },
]

const typeColors = {
  Concert:    { bg: '#e8f0fe', text: '#1a56db' },
  Conference: { bg: '#fef3c7', text: '#92400e' },
  Festival:   { bg: '#d1fae5', text: '#065f46' },
}

function EventCard({ event }) {
  const tag = typeColors[event.type] || { bg: '#f3f4f6', text: '#374151' }
  const soldPct = Math.round(((event.capacity - event.spotsLeft) / event.capacity) * 100)

  return (
    <div style={styles.card}>
      <div style={styles.cardTop}>
        <div>
          <span style={{ ...styles.typeTag, background: tag.bg, color: tag.text }}>
            {event.type}
          </span>
          <h3 style={styles.eventName}>{event.name}</h3>
          <p style={styles.meta}>{event.date} &nbsp;·&nbsp; {event.time}</p>
          <p style={styles.meta}>{event.venue} — {event.city}</p>
        </div>
        <div style={styles.priceBlock}>
          <span style={styles.price}>${event.price.toFixed(2)}</span>
          <span style={styles.priceLabel}>per ticket</span>
        </div>
      </div>

      <div style={styles.cardBottom}>
        <div style={styles.capacityWrap}>
          <div style={styles.capacityBar}>
            <div style={{ ...styles.capacityFill, width: `${soldPct}%` }} />
          </div>
          <span style={styles.capacityText}>{event.spotsLeft.toLocaleString()} spots left</span>
        </div>
        <button style={styles.buyBtn}>Buy Ticket</button>
      </div>
    </div>
  )
}

function UpcomingEvents() {
  const [query, setQuery]  = useState('')
  const [date, setDate]    = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return mockEvents.filter(e => {
      const matchesText = !q ||
        e.name.toLowerCase().includes(q) ||
        e.city.toLowerCase().includes(q) ||
        e.venue.toLowerCase().includes(q)
      const matchesDate = !date || e.isoDate >= date
      return matchesText && matchesDate
    })
  }, [query, date])

  return (
    <div>
      <h2 style={styles.heading}>Upcoming Events</h2>

      {/* Search bar */}
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
          <button
            style={styles.clearBtn}
            onClick={() => { setQuery(''); setDate('') }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyText}>No events match your search.</p>
          <button style={styles.clearBtn} onClick={() => { setQuery(''); setDate('') }}>
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {(query || date) && (
            <p style={styles.resultCount}>
              {filtered.length} event{filtered.length !== 1 ? 's' : ''} found
            </p>
          )}
          <div style={styles.list}>
            {filtered.map(e => <EventCard key={e.id} event={e} />)}
          </div>
        </>
      )}
    </div>
  )
}

const styles = {
  heading: { fontSize: '20px', fontWeight: '700', color: '#003366', margin: '0 0 20px' },

  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0',
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '12px 20px',
    marginBottom: '24px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    flexWrap: 'wrap',
    gap: '8px',
  },
  searchField: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: '160px',
  },
  searchLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    fontSize: '15px',
    color: '#111',
    background: 'transparent',
    padding: '2px 0',
  },
  divider: {
    width: '1px',
    height: '36px',
    background: '#e5e7eb',
    margin: '0 16px',
    alignSelf: 'center',
  },
  clearBtn: {
    background: 'none',
    border: '1px solid #d1d5db',
    color: '#6b7280',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    alignSelf: 'center',
  },

  resultCount: {
    fontSize: '13px',
    color: '#6b7280',
    margin: '0 0 16px',
  },

  empty: {
    textAlign: 'center',
    padding: '48px 0',
  },
  emptyText: {
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '16px',
  },

  list: { display: 'flex', flexDirection: 'column', gap: '16px' },
  card: {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '20px 24px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  typeTag: {
    display: 'inline-block',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '3px 10px',
    borderRadius: '20px',
    marginBottom: '8px',
  },
  eventName: { fontSize: '18px', fontWeight: '700', color: '#111', margin: '0 0 6px' },
  meta:      { fontSize: '14px', color: '#666', margin: '2px 0' },
  priceBlock: { textAlign: 'right', flexShrink: 0, marginLeft: '16px' },
  price:      { display: 'block', fontSize: '22px', fontWeight: '700', color: '#004080' },
  priceLabel: { fontSize: '12px', color: '#999' },
  cardBottom: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
  },
  capacityWrap: { flex: 1 },
  capacityBar: {
    height: '6px',
    background: '#e5e7eb',
    borderRadius: '99px',
    overflow: 'hidden',
    marginBottom: '6px',
  },
  capacityFill: {
    height: '100%',
    background: '#004080',
    borderRadius: '99px',
  },
  capacityText: { fontSize: '12px', color: '#666' },
  buyBtn: {
    background: '#004080',
    color: 'white',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
}

export default UpcomingEvents

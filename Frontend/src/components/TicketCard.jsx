import { useState } from 'react'

function TicketCard({ eventName, seat, ticketId }) {
  const [showQR, setShowQR] = useState(false)

  return (
    <section style={{ backgroundColor: '#f4f4f4', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <h3>My Tickets</h3>
      <p><strong>Event:</strong> Summer Music Festival</p>
      <p><strong>Seat:</strong> General Admission</p>

      <button
        onClick={() => setShowQR(!showQR)}
        style={{ 
          backgroundColor: '#ff9900', color: 'white', border: 'none', 
          padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', 
          fontSize: '16px', fontWeight: 'bold', marginTop: '10px'
        }}
      >
        {showQR ? 'Hide Digital Ticket' : 'View Digital Ticket'}
      </button>

      {showQR && (
        <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#e9ecef', textAlign: 'center', borderRadius: '8px', border: '2px dashed #6c757d' }}>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=Ticket12345" alt="QR Code" />
          <p>Scan this code at the entry gate</p>
        </div>
      )}
    </section>
  )
}

export default TicketCard
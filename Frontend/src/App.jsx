import { useState } from 'react'

function App() {
  // This is React's memory. It remembers if the QR code should be visible or hidden.
  const [showQR, setShowQR] = useState(false)

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px', maxWidth: '800px', margin: '0 auto', color: '#333' }}>
      
      {/* Header */}
      <header style={{ backgroundColor: '#004080', color: 'white', padding: '20px', borderRadius: '8px' }}>
        <h1 style={{ margin: 0 }}>Smart Events</h1>
        <h3 style={{ margin: 0, fontWeight: 'normal' }}>Attendee Portal</h3>
      </header>

      {/* Main Content Area */}
      <main style={{ marginTop: '20px' }}>
        
        {/* Welcome Card */}
        <section style={{ backgroundColor: '#f4f4f4', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2>Welcome to your Dashboard!</h2>
          <p>Manage your upcoming events and access your digital tickets below.</p>
        </section>

        {/* Ticket Card */}
        <section style={{ backgroundColor: '#f4f4f4', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3>My Tickets</h3>
          <p><strong>Event:</strong> Summer Music Festival</p>
          <p><strong>Seat:</strong> General Admission</p>

          {/* The Button */}
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

          {/* The QR Code (Only shows if showQR is true) */}
          {showQR && (
            <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#e9ecef', textAlign: 'center', borderRadius: '8px', border: '2px dashed #6c757d' }}>
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=Ticket12345" alt="QR Code" />
              <p>Scan this code at the entry gate</p>
            </div>
          )}
          
        </section>
      </main>
    </div>
  )
}

export default App
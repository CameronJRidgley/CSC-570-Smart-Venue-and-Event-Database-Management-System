import Header from './components/Header'
import TicketCard from './components/TicketCard'

// This acts as our temporary database until the backend is ready!
const mockTicketData = [
  { id: 'TKT-001', eventName: 'Summer Music Festival', seat: 'General Admission' },
  { id: 'TKT-002', eventName: 'Tech Innovators Conference', seat: 'VIP Table 4' },
  { id: 'TKT-003', eventName: 'Local Food Truck Fiesta', seat: 'Entry Pass' }
]

function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px', maxWidth: '800px', margin: '0 auto', color: '#333' }}>
      
      <Header />

      <main style={{ marginTop: '20px' }}>
        
        <section style={{ backgroundColor: '#f4f4f4', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2>Welcome to your Dashboard!</h2>
          <p>Manage your upcoming events and access your digital tickets below.</p>
        </section>

        {/* The Magic Loop: For every ticket in our fake database, render a TicketCard and pass it the data */}
        {mockTicketData.map((ticket) => (
          <TicketCard 
            key={ticket.id} 
            eventName={ticket.eventName} 
            seat={ticket.seat} 
            ticketId={ticket.id}
          />
        ))}

      </main>
    </div>
  )
}

export default App
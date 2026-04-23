import Header from './components/Header'
import TicketCard from './components/TicketCard'

function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px', maxWidth: '800px', margin: '0 auto', color: '#333' }}>
      
      {/* We just drop the Header component in like a custom HTML tag! */}
      <Header />

      <main style={{ marginTop: '20px' }}>
        
        <section style={{ backgroundColor: '#f4f4f4', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2>Welcome to your Dashboard!</h2>
          <p>Manage your upcoming events and access your digital tickets below.</p>
        </section>

        {/* And we drop the Ticket Card in here! */}
        <TicketCard />

      </main>
    </div>
  )
}

export default App
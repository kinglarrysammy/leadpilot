import React, { useState } from 'react'

function App() {
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Hi there! I'm LeadPilot. 🏠\n\nDo you want to buy, rent, or invest in a property?" }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [leadData, setLeadData] = useState({
    intent: '',
    location: '',
    budget: '',
    timeline: '',
    name: '',
    phone: '',
    email: ''
  })

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setMessages(prev => [...prev, { role: 'user', text: userMessage }])
    setInput('')
    setIsLoading(true)

    try {
      // Get AI response
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', text: userMessage }],
          step,
          leadData
        })
      })

      const data = await response.json()
      
      setMessages(prev => [...prev, { role: 'bot', text: data.reply }])
      
      if (data.step !== undefined) {
        setStep(data.step)
      }
      
      if (data.leadData) {
        setLeadData(data.leadData)
      }

      // If lead is complete, extract and save
      if (data.leadComplete) {
        await fetch('/api/extract-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation: [...messages, { role: 'user', text: userMessage }],
            leadData: { ...leadData, ...data.leadData }
          })
        })
      }

    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: "Sorry, I'm having trouble connecting. Please try again." 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h1>LeadPilot</h1>
        <p>AI-Powered Lead Qualification</p>
      </div>
      
      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            {msg.text.split('\n').map((line, i) => (
              <React.Fragment key={i}>
                {line}
                {i < msg.text.split('\n').length - 1 && <br />}
              </React.Fragment>
            ))}
          </div>
        ))}
        {isLoading && (
          <div className="typing-indicator">LeadPilot is typing...</div>
        )}
      </div>

      <form className="chat-input-form" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your response..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          Send
        </button>
      </form>
    </div>
  )
}

export default App

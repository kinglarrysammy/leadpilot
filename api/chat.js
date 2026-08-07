import { GoogleGenerativeAI } from '@google/generative-ai'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { messages, step, leadData } = req.body

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'API key missing' })
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    // Get the last user message
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()
    if (!lastUserMessage) {
      return res.status(400).json({ error: 'No user message found' })
    }

    // Build a simple prompt
    const conversationHistory = messages.map(m => 
      `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`
    ).join('\n')

    const prompt = `
You are LeadPilot, a friendly real estate chatbot.

Current question step: ${step}
Collected data: ${JSON.stringify(leadData)}

Conversation so far:
${conversationHistory}

User just said: "${lastUserMessage.text}"

Your job: Ask the next question to collect information in this order:
1. Intent (buy/rent/invest) - if step 0
2. Location preference - if step 1
3. Budget range - if step 2
4. Timeline - if step 3
5. Full name - if step 4
6. Phone number - if step 5
7. Email address - if step 6

If all collected (step 7), say "Great! I have everything I need. An agent will contact you shortly."

Keep response under 2 sentences. Be warm and professional.
`

    const result = await model.generateContent(prompt)
    const reply = result.response.text()

    // Update step
    let newStep = step
    let newLeadData = { ...leadData }
    let leadComplete = false

    if (step === 0 && lastUserMessage.text.length > 1) {
      newLeadData.intent = lastUserMessage.text
      newStep = 1
    } else if (step === 1 && lastUserMessage.text.length > 1) {
      newLeadData.location = lastUserMessage.text
      newStep = 2
    } else if (step === 2 && lastUserMessage.text.length > 1) {
      newLeadData.budget = lastUserMessage.text
      newStep = 3
    } else if (step === 3 && lastUserMessage.text.length > 1) {
      newLeadData.timeline = lastUserMessage.text
      newStep = 4
    } else if (step === 4 && lastUserMessage.text.length > 1) {
      newLeadData.name = lastUserMessage.text
      newStep = 5
    } else if (step === 5 && lastUserMessage.text.length > 1) {
      newLeadData.phone = lastUserMessage.text
      newStep = 6
    } else if (step === 6 && lastUserMessage.text.includes('@')) {
      newLeadData.email = lastUserMessage.text
      newStep = 7
      leadComplete = true
    }

    res.status(200).json({
      reply: reply || "Thanks for sharing! Let me ask you the next question.",
      step: newStep,
      leadData: newLeadData,
      leadComplete
    })

  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ 
      error: 'Failed to process message',
      details: error.message 
    })
  }
}

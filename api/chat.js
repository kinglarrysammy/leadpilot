import { GoogleGenerativeAI } from '@google/generative-ai'

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { messages, step, leadData } = req.body

    // Log for debugging
    console.log('API Key exists:', !!process.env.GEMINI_API_KEY)
    console.log('Step:', step)
    console.log('Message count:', messages.length)

    // Check if API key exists
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is missing')
      return res.status(500).json({ error: 'API key not configured' })
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    // Build conversation
    const lastMessage = messages[messages.length - 1].text

    // Simple prompt without history to avoid issues
    const prompt = `
You are LeadPilot, a real estate lead qualification chatbot.

Current step: ${step}
Current lead data: ${JSON.stringify(leadData)}

Previous conversation:
${messages.map(m => `${m.role}: ${m.text}`).join('\n')}

User's last message: ${lastMessage}

Rules:
- Ask ONE question at a time
- Keep responses short and friendly
- Collect in this order: intent, location, budget, timeline, name, phone, email
- When all collected, say "Great! I have everything I need. An agent will contact you shortly."

Respond naturally as a helpful real estate assistant.
`

    const result = await model.generateContent(prompt)
    const reply = result.response.text()

    // Simple step tracking
    let newStep = step
    let newLeadData = { ...leadData }
    let leadComplete = false

    if (step === 0) {
      newLeadData.intent = lastMessage
      newStep = 1
    } else if (step === 1) {
      newLeadData.location = lastMessage
      newStep = 2
    } else if (step === 2) {
      newLeadData.budget = lastMessage
      newStep = 3
    } else if (step === 3) {
      newLeadData.timeline = lastMessage
      newStep = 4
    } else if (step === 4) {
      newLeadData.name = lastMessage
      newStep = 5
    } else if (step === 5) {
      newLeadData.phone = lastMessage
      newStep = 6
    } else if (step === 6) {
      newLeadData.email = lastMessage
      newStep = 7
      leadComplete = true
    }

    res.status(200).json({
      reply,
      step: newStep,
      leadData: newLeadData,
      leadComplete
    })

  } catch (error) {
    console.error('Error details:', error)
    res.status(500).json({ 
      error: 'Failed to process message',
      details: error.message 
    })
  }
      }

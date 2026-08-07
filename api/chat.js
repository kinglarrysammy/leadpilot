import { GoogleGenerativeAI } from '@google/generative-ai'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { messages, step, leadData } = req.body
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    // Build conversation history for Gemini
    const chat = model.startChat({
      history: messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }))
    })

    // Get last user message
    const lastMessage = messages[messages.length - 1].text

    // System prompt to guide the conversation
    const systemPrompt = `
You are LeadPilot, a real estate lead qualification chatbot.

Your goal: Ask ONE question at a time to collect these 7 pieces of info in order:
1. Intent (buy/rent/invest) - ALREADY ASKED in initial message
2. Location preference (city/area)
3. Budget range
4. Timeline (when they want to move)
5. Full name
6. Phone number
7. Email address

Current collected data:
${JSON.stringify(leadData, null, 2)}

Current step: ${step}

Rules:
- Ask ONLY ONE question per response
- Keep responses friendly and conversational
- If they give multiple pieces at once, acknowledge and extract them
- Move to next question when current info is collected
- When all 7 are collected, say "Great! I have everything I need. An agent will contact you shortly." and include a summary

Previous messages show the conversation. Respond naturally as a helpful real estate assistant.
`

    const result = await chat.sendMessage(`${systemPrompt}\n\nUser: ${lastMessage}`)
    const reply = result.response.text()

    // Simple logic to track step progression
    let newStep = step
    let newLeadData = { ...leadData }
    let leadComplete = false

    // Extract info based on step (simplified - will be improved)
    if (step === 0 && (lastMessage.toLowerCase().includes('buy') || lastMessage.toLowerCase().includes('rent') || lastMessage.toLowerCase().includes('invest'))) {
      newLeadData.intent = lastMessage
      newStep = 1
    } else if (step === 1 && lastMessage.length > 2) {
      newLeadData.location = lastMessage
      newStep = 2
    } else if (step === 2 && lastMessage.length > 2) {
      newLeadData.budget = lastMessage
      newStep = 3
    } else if (step === 3 && lastMessage.length > 2) {
      newLeadData.timeline = lastMessage
      newStep = 4
    } else if (step === 4 && lastMessage.length > 2) {
      newLeadData.name = lastMessage
      newStep = 5
    } else if (step === 5 && lastMessage.length > 2) {
      newLeadData.phone = lastMessage
      newStep = 6
    } else if (step === 6 && lastMessage.includes('@')) {
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
    console.error('Error:', error)
    res.status(500).json({ error: 'Failed to process message' })
  }
}

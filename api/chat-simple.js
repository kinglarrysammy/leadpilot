export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { messages } = req.body
    
    const lastMessage = messages[messages.length - 1]
    
    res.status(200).json({
      reply: `You said: "${lastMessage.text}". This is a test response!`,
      step: 1,
      leadData: { intent: lastMessage.text },
      leadComplete: false
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

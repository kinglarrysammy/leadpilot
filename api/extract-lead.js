import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { conversation, leadData } = req.body

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    // Format conversation for extraction
    const conversationText = conversation.map(msg => 
      `${msg.role}: ${msg.text}`
    ).join('\n')

    // Extract structured data using Gemini
    const prompt = `
Extract the following information from this real estate lead conversation. Return ONLY a JSON object with these fields:

{
  "intent": "buy/rent/invest",
  "location_preference": "city or area name",
  "budget_range": "budget mentioned",
  "timeline": "when they want to move",
  "contact_name": "full name",
  "contact_phone": "phone number",
  "contact_email": "email address"
}

If a field is not mentioned, use null.

Conversation:
${conversationText}

Lead data already collected:
${JSON.stringify(leadData, null, 2)}

Return ONLY the JSON object, no other text.
`

    const result = await model.generateContent(prompt)
    const response = result.response.text()
    
    // Parse the JSON response
    const extractedData = JSON.parse(response)

    // Merge with existing lead data
    const finalLeadData = {
      ...leadData,
      ...extractedData
    }

    // Initialize Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Save to Supabase
    const { data, error } = await supabase
      .from('leads')
      .insert([{
        agency_id: 'default',
        intent: finalLeadData.intent || null,
        location_preference: finalLeadData.location_preference || null,
        budget_range: finalLeadData.budget_range || null,
        timeline: finalLeadData.timeline || null,
        contact_name: finalLeadData.contact_name || null,
        contact_phone: finalLeadData.contact_phone || null,
        contact_email: finalLeadData.contact_email || null,
        raw_conversation: conversationText,
        qualified: true,
        notified: false
      }])

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ error: 'Failed to save lead' })
    }

    res.status(200).json({ 
      success: true, 
      lead: data,
      message: 'Lead saved successfully'
    })

  } catch (error) {
    console.error('Extraction error:', error)
    res.status(500).json({ error: 'Failed to extract lead data' })
  }
        }

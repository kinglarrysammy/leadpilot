export default async function handler(req, res) {
  res.status(200).json({ 
    message: 'API is working!',
    env: {
      hasGemini: !!process.env.GEMINI_API_KEY,
      hasSupabase: !!process.env.SUPABASE_URL,
      hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  })
}

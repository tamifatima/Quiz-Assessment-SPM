import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const MODEL_NAME = "gemini-1.5-flash"

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in Supabase secrets')
    }

    const { topicText } = await req.json()
    if (!topicText) {
      throw new Error('topicText is required')
    }

    const prompt = `
      You are an expert educator. Based on the text provided below, generate 5 high-quality multiple-choice questions.
      
      Output MUST be a raw JSON array of objects.
      Each object must follow this structure:
      {
        "question_text": "The question string",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer": "The exact string matching one of the options",
        "explanation": "A brief explanation of why this answer is correct"
      }

      Topic Text:
      ${topicText}
    `

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            response_mime_type: "application/json",
          }
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Gemini API Error:', errorData)
      throw new Error(`Gemini API returned ${response.status}: ${errorData.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    let aiText = data.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!aiText) {
      throw new Error('AI failed to generate a response content.')
    }

    // Sometimes Gemini wraps JSON in markdown even if told not to
    aiText = aiText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim()
    
    const questions = JSON.parse(aiText)

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Function Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

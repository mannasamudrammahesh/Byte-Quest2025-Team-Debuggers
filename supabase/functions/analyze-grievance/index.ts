import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, title, input_mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an AI assistant for a government grievance redressal system called GrievAI. 
Analyze the citizen's grievance and classify it.

Return a JSON object with:
- category: one of [civic_infrastructure, sanitation, utilities, public_safety, healthcare, education, administration]
- priority: one of [low, medium, high, critical] based on urgency
- department: the government department name
- confidence: 0.0 to 1.0
- summary: a brief 1-sentence summary

Base priority on:
- critical: safety hazards, health emergencies, blocked roads
- high: utilities outage, major inconvenience
- medium: general complaints, service requests
- low: suggestions, minor issues`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Title: ${title || 'Not provided'}\n\nDescription: ${description}` }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'classify_grievance',
              description: 'Classify the grievance into category, priority, and department',
              parameters: {
                type: 'object',
                properties: {
                  category: { 
                    type: 'string', 
                    enum: ['civic_infrastructure', 'sanitation', 'utilities', 'public_safety', 'healthcare', 'education', 'administration']
                  },
                  priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                  department: { type: 'string' },
                  confidence: { type: 'number' },
                  summary: { type: 'string' }
                },
                required: ['category', 'priority', 'department', 'confidence', 'summary']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'classify_grievance' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI analysis failed');
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No tool call in response');
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    console.log('AI Analysis result:', analysis);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-grievance:', error);
    
    // Return fallback analysis
    return new Response(JSON.stringify({
      category: 'administration',
      priority: 'medium',
      department: 'General Administration',
      confidence: 0.5,
      summary: 'Grievance requires manual review'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

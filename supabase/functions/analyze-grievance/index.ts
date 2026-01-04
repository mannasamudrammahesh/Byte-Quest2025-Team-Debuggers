import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client for authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user authentication
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { description, title, input_mode, location_address } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      // Return a more detailed fallback analysis
      return new Response(JSON.stringify({
        category: 'administration',
        priority: 'medium',
        department: 'General Administration',
        confidence: 0.3,
        summary: 'AI analysis unavailable - manual review required',
        error: 'API key not configured'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enhanced system prompt with location context
    const systemPrompt = `You are an AI assistant for a government grievance redressal system called GrievAI. 
Analyze the citizen's grievance and classify it accurately.

Consider the following context:
- Location: ${location_address || 'Not provided'}
- Input method: ${input_mode}

Return a JSON object with:
- category: one of [civic_infrastructure, sanitation, utilities, public_safety, healthcare, education, administration]
- priority: one of [low, medium, high, critical] based on urgency and impact
- department: the specific government department that should handle this
- confidence: 0.0 to 1.0 (be honest about uncertainty)
- summary: a brief 1-sentence summary of the issue

Priority guidelines:
- critical: immediate safety hazards, health emergencies, major infrastructure failures, blocked emergency routes
- high: utilities outage affecting many people, significant public inconvenience, urgent health/safety concerns
- medium: general service complaints, infrastructure maintenance needs, administrative issues
- low: suggestions for improvement, minor inconveniences, information requests

Department mapping:
- civic_infrastructure: Public Works Department, Municipal Corporation
- sanitation: Sanitation Department, Waste Management
- utilities: Electricity Board, Water Department, Gas Authority
- public_safety: Police Department, Fire Department, Traffic Police
- healthcare: Health Department, Municipal Hospital
- education: Education Department, School Administration
- administration: General Administration, Revenue Department`;

    const userContent = `Title: ${title || 'Not provided'}
Description: ${description}
Location: ${location_address || 'Not specified'}`;

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
          { role: 'user', content: userContent }
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
                  confidence: { type: 'number', minimum: 0, maximum: 1 },
                  summary: { type: 'string', maxLength: 200 }
                },
                required: ['category', 'priority', 'department', 'confidence', 'summary']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'classify_grievance' } },
        temperature: 0.3, // Lower temperature for more consistent results
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      // Return enhanced fallback based on simple keyword analysis
      const fallbackAnalysis = generateFallbackAnalysis(description, title);
      return new Response(JSON.stringify(fallbackAnalysis), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.error('No tool call in AI response');
      const fallbackAnalysis = generateFallbackAnalysis(description, title);
      return new Response(JSON.stringify(fallbackAnalysis), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    // Validate analysis results
    if (!analysis.category || !analysis.priority || !analysis.department || 
        analysis.confidence === undefined || !analysis.summary) {
      console.error('Incomplete analysis from AI:', analysis);
      const fallbackAnalysis = generateFallbackAnalysis(description, title);
      return new Response(JSON.stringify(fallbackAnalysis), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('AI Analysis result:', analysis);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-grievance:', error);
    
    // Enhanced fallback analysis
    try {
      const { description, title } = await req.json().catch(() => ({ description: '', title: '' }));
      const fallbackAnalysis = generateFallbackAnalysis(description, title);
      
      return new Response(JSON.stringify(fallbackAnalysis), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (fallbackError) {
      console.error('Fallback analysis failed:', fallbackError);
      return new Response(
        JSON.stringify({ 
          error: 'Analysis failed', 
          category: 'administration',
          priority: 'medium',
          department: 'General Administration',
          confidence: 0.3,
          summary: 'Manual review required'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  }
});

// Enhanced fallback analysis using keyword matching
function generateFallbackAnalysis(description: string, title: string): any {
  const text = `${title} ${description}`.toLowerCase();
  
  // Keyword-based category detection
  let category = 'administration';
  let department = 'General Administration';
  let priority = 'medium';
  
  if (text.includes('road') || text.includes('bridge') || text.includes('infrastructure') || 
      text.includes('construction') || text.includes('pothole') || text.includes('street')) {
    category = 'civic_infrastructure';
    department = 'Public Works Department';
  } else if (text.includes('garbage') || text.includes('waste') || text.includes('cleaning') || 
             text.includes('sanitation') || text.includes('toilet') || text.includes('drain')) {
    category = 'sanitation';
    department = 'Sanitation Department';
  } else if (text.includes('water') || text.includes('electricity') || text.includes('power') || 
             text.includes('gas') || text.includes('utility')) {
    category = 'utilities';
    department = 'Utilities Department';
  } else if (text.includes('police') || text.includes('safety') || text.includes('crime') || 
             text.includes('emergency') || text.includes('fire') || text.includes('accident')) {
    category = 'public_safety';
    department = 'Police Department';
  } else if (text.includes('hospital') || text.includes('health') || text.includes('medical') || 
             text.includes('doctor') || text.includes('medicine')) {
    category = 'healthcare';
    department = 'Health Department';
  } else if (text.includes('school') || text.includes('education') || text.includes('teacher') || 
             text.includes('student') || text.includes('college')) {
    category = 'education';
    department = 'Education Department';
  }
  
  // Priority detection based on urgency keywords
  if (text.includes('emergency') || text.includes('urgent') || text.includes('critical') || 
      text.includes('danger') || text.includes('blocked') || text.includes('accident')) {
    priority = 'critical';
  } else if (text.includes('important') || text.includes('serious') || text.includes('major') || 
             text.includes('outage') || text.includes('broken')) {
    priority = 'high';
  } else if (text.includes('minor') || text.includes('suggestion') || text.includes('improve')) {
    priority = 'low';
  }
  
  return {
    category,
    priority,
    department,
    confidence: 0.6, // Moderate confidence for keyword-based analysis
    summary: `${category.replace('_', ' ')} issue requiring ${priority} priority attention`,
    fallback: true
  };
}



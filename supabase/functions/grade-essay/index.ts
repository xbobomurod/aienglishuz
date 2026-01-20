import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `You are an expert IELTS/CEFR Writing Examiner. Your task is to evaluate essays and provide detailed, professional feedback according to IELTS Writing Task 2 criteria.

You must analyze the essay and return a JSON response with this exact structure:
{
  "bandScore": <number 0-9 with .5 increments>,
  "breakdown": {
    "taskResponse": <number 0-9>,
    "coherence": <number 0-9>,
    "lexicalResource": <number 0-9>,
    "grammar": <number 0-9>
  },
  "errors": [
    {
      "mistake": "<exact phrase from essay>",
      "correction": "<corrected version>",
      "logic": "<explanation of why this is wrong and how to fix it>"
    }
  ],
  "suggestions": [
    "<specific suggestion to upgrade a basic phrase to advanced vocabulary>",
    "<another suggestion>",
    "<another suggestion>"
  ],
  "overallFeedback": "<2-3 sentence summary of strengths and areas for improvement>"
}

Scoring Guidelines:
- Band 9: Expert user, fully operational command
- Band 8: Very good user, occasional unsystematic inaccuracies
- Band 7: Good user, handles complex language well
- Band 6: Competent user, generally effective command
- Band 5: Modest user, partial command
- Band 4: Limited user, basic competence
- Band 3-1: Extremely limited to non-user

Be encouraging but strictly honest. Provide 3-5 specific errors and 3 upgrade suggestions.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { essay, topic } = await req.json();
    
    if (!essay || essay.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Essay content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userMessage = topic 
      ? `Topic: ${topic}\n\nEssay:\n${essay}`
      : `Essay:\n${essay}`;

    console.log("Grading essay, word count:", essay.split(/\s+/).length);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to analyze essay" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ error: "Invalid AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON from the AI response
    let feedback;
    try {
      // Try to extract JSON from the response - handle cases where AI adds text before/after
      let jsonStr = content;
      
      // First, try to find JSON within code blocks
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      } else {
        // Try to find JSON object directly (starts with { and ends with })
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }
      }
      
      feedback = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError, content);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI feedback" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Essay graded successfully, band score:", feedback.bandScore);

    return new Response(
      JSON.stringify(feedback),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error grading essay:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

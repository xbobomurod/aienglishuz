import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `You are an expert IELTS Speaking Examiner and Linguistic Analyst. Analyze the provided Speech-to-Text transcript.

**Phase 1: Speech Quality Analysis**
- Identify filler words (e.g., "uhm", "err", "like", "you know") and repetitive phrases
- Analyze the flow: Is the response too short, or does it lack logical connectors?

**Phase 2: Linguistic Evaluation (IELTS Criteria)**
1. Fluency & Coherence: Does the speaker connect ideas logically?
2. Lexical Resource: Identify basic vocabulary and suggest advanced synonyms/idioms
3. Grammatical Range: Detect spoken grammar errors (tense shifts, subject-verb agreement)

Return a JSON response with this exact structure:
{
  "bandScore": <number 0-9 with .5 increments>,
  "scoreJustification": "<brief 1-2 sentence justification of the score>",
  "fluencyScore": <number 0-9>,
  "vocabularyScore": <number 0-9>,
  "grammarScore": <number 0-9>,
  "transcriptWithHighlights": "<the user's transcript with **bold** markers around mistakes/issues>",
  "fillerWords": [
    {
      "word": "<filler word found>",
      "count": <number of occurrences>,
      "suggestion": "<e.g., 'You used like 5 times. Try using furthermore or specifically.'>"
    }
  ],
  "vocabularyUpgrades": [
    {
      "original": "<basic word/phrase used>",
      "upgrade": "<advanced synonym or idiom>",
      "example": "<example sentence using the upgrade>"
    }
  ],
  "grammarCorrections": [
    {
      "mistake": "<the spoken grammar error>",
      "correction": "<the correct form>",
      "explanation": "<brief explanation>"
    }
  ],
  "nativeUpgrade": "<2-3 sentence version of how a native speaker would answer the same question naturally and fluently>",
  "dailyPracticeTip": "<one specific exercise to improve based on today's performance>",
  "overallFeedback": "<2-3 sentence encouraging summary of strengths and improvement areas>"
}

Tone: Encouraging, professional, and analytical. Be strictly honest about the score.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, topic } = await req.json();
    
    if (!transcript || transcript.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Transcript content is required" }),
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
      ? `Speaking Topic: ${topic}\n\nTranscript:\n${transcript}`
      : `Transcript:\n${transcript}`;

    console.log("Analyzing speaking transcript, word count:", transcript.split(/\s+/).length);

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
        JSON.stringify({ error: "Failed to analyze transcript" }),
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

    console.log("Speaking analyzed successfully, band score:", feedback.bandScore);

    return new Response(
      JSON.stringify(feedback),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error analyzing speaking:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const getSystemPrompt = (taskType: string, hasImage: boolean = false) => {
  const basePrompt = `You are a senior, certified IELTS Speaking Examiner who has assessed thousands of live face-to-face IELTS Speaking tests in British Council and IDP centres. You apply the official IELTS Speaking Band Descriptors verbatim (0–9 in 0.5 steps). Do NOT use CEFR, TOEFL, or any other scale.

ANCHOR DESCRIPTORS (use these to justify every score):
• Band 9 — Fluent with only very occasional repetition/self-correction (hesitation is content-related, not for language); speaks at length coherently; uses idiomatic vocabulary naturally and precisely; full range of structures with full flexibility and accuracy; pronunciation precise with full range of features and effortless to understand.
• Band 8 — Fluent with only occasional hesitation/repetition; develops topics coherently; wide vocabulary with skilful paraphrase; wide range of structures, majority error-free; wide range of pronunciation features sustained, easy to understand throughout.
• Band 7 — Speaks at length without noticeable loss of coherence; some language-related hesitation; flexible vocabulary including less-common items; range of complex structures with frequent error-free sentences; range of pronunciation features used with mixed control, generally easy to understand.
• Band 6 — Willing to speak at length but loses coherence with repetition and self-correction; vocabulary wide enough to discuss familiar/unfamiliar topics, meaning generally clear; mix of simple and complex structures with limited flexibility, frequent errors; uses a range of pronunciation features with mixed control, generally understood.
• Band 5 — Maintains flow with noticeable effort and reformulation; can talk about familiar topics but struggles with unfamiliar; limited flexibility, frequent inappropriate word choice; basic sentence forms with reasonable accuracy, complex structures usually contain errors; pronunciation shows limited range, mispronunciations cause some difficulty for the listener.
• Band 4 — Cannot respond without noticeable pauses; speech may be slow with frequent repetition/self-correction; limited vocabulary, simple structures, frequent errors; mispronunciations cause considerable difficulty.
• Band 3 and below — Long pauses, limited language and intelligibility.

SCORING RULES (mandatory):
1. Score each of the FOUR criteria (Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation) independently using the anchors above.
2. Final bandScore = average of the four criterion scores, rounded to nearest 0.5 using IELTS convention (.25 rounds up to .5, .75 rounds up to next whole).
3. Be strict. A typical learner sits at 5.5–6.5. Do not award 7+ without clearly justifying with extracts from their transcript.
4. Quote at least 2 short extracts from the candidate transcript inside scoreJustification and use those to defend the band.
5. If transcript is under 40 words OR off-topic, cap bandScore at 4.0.
6. Memorised-sounding language (rote phrases, recitation) → cap Lexical Resource at 5.0.

Return valid JSON only — no prose, no markdown.`;

  if (taskType === "interview") {
    return `${basePrompt}

IELTS SPEAKING PART 1 — INTERVIEW (4–5 minutes):
Examiner asks short personal questions on 2–3 familiar topics (home, work/study, hobbies, daily routine). The candidate is expected to answer in 2–4 sentences each — concise, extended, natural, not memorised. Direct answer + brief reason / example.
Mark down: 1–word answers, rote answers, off-topic monologues, total dependence on memorised chunks.

Return JSON:
{
  "bandScore": <number 0-9 with .5 increments>,
  "scoreJustification": "<brief justification>",
  "fluencyScore": <number 0-9>,
  "vocabularyScore": <number 0-9>,
  "grammarScore": <number 0-9>,
  "pronunciationScore": <number 0-9>,
  "transcriptWithHighlights": "<transcript with **bold** on errors>",
  "fillerWords": [{"word": "<filler>", "count": <n>, "suggestion": "<tip>"}],
  "vocabularyUpgrades": [{"original": "<word>", "upgrade": "<better word>", "example": "<sentence>"}],
  "grammarCorrections": [{"mistake": "<error>", "correction": "<fix>", "explanation": "<brief correction explanation>"}],
  "nativeUpgrade": "<Band 8+ model answer>",
  "dailyPracticeTip": "<specific exercise>",
  "overallFeedback": "<summary>"
}`;
  }

  if (taskType === "talk") {
    return `${basePrompt}

IELTS SPEAKING PART 2 — INDIVIDUAL LONG TURN (3–4 minutes):
The candidate had 1 minute to prepare, then must speak for 1–2 minutes unaided on a cue card with 3–4 bullet prompts. Expect ~180–260 spoken words. The candidate must cover ALL bullet points and develop the topic with specific details (who, when, where, why, how).
Mark down: stopping under 60 seconds, missing bullet points, drifting off-topic, listing without development.

Return JSON:
{
  "bandScore": <number 0-9 with .5 increments>,
  "scoreJustification": "<brief justification>",
  "fluencyScore": <number 0-9>,
  "vocabularyScore": <number 0-9>,
  "grammarScore": <number 0-9>,
  "coherenceScore": <number 0-9>,
  "transcriptWithHighlights": "<transcript with **bold** on errors>",
  "topicCoverage": {
    "covered": ["<points addressed>"],
    "missed": ["<points not addressed>"],
    "feedback": "<feedback on topic development>"
  },
  "fillerWords": [{"word": "<filler>", "count": <n>, "suggestion": "<tip>"}],
  "vocabularyUpgrades": [{"original": "<word>", "upgrade": "<better word>", "example": "<sentence>"}],
  "grammarCorrections": [{"mistake": "<error>", "correction": "<fix>", "explanation": "<brief correction explanation>"}],
  "nativeUpgrade": "<Band 8+ model response to the same cue card>",
  "dailyPracticeTip": "<specific exercise>",
  "overallFeedback": "<summary>"
}`;
  }

  if (taskType === "discussion") {
    return `${basePrompt}

IELTS SPEAKING PART 3 — TWO-WAY DISCUSSION (4–5 minutes):
Examiner asks abstract/analytical questions linked to the Part 2 topic. Candidate must speculate, compare, give opinions and counter-opinions, agree/disagree with justification, and use hypothetical and conditional language ("If governments were to...", "What might happen is..."). Answers should be 3–6 sentences each with reasoning.
Mark down: simplistic Part-1-style answers, no justification, no abstract language, lack of complex structures.

Return JSON:
{
  "bandScore": <number 0-9 with .5 increments>,
  "scoreJustification": "<brief justification>",
  "fluencyScore": <number 0-9>,
  "vocabularyScore": <number 0-9>,
  "grammarScore": <number 0-9>,
  "analyticalScore": <number 0-9>,
  "transcriptWithHighlights": "<transcript with **bold** on errors>",
  "argumentAnalysis": {
    "strengths": ["<strong points in their argument>"],
    "weaknesses": ["<areas to improve>"],
    "feedback": "<feedback on analytical skills>"
  },
  "fillerWords": [{"word": "<filler>", "count": <n>, "suggestion": "<tip>"}],
  "vocabularyUpgrades": [{"original": "<word>", "upgrade": "<better word>", "example": "<sentence>"}],
  "grammarCorrections": [{"mistake": "<error>", "correction": "<fix>", "explanation": "<brief correction explanation>"}],
  "nativeUpgrade": "<Band 8+ model discussion response>",
  "dailyPracticeTip": "<specific exercise>",
  "overallFeedback": "<summary>"
}`;
  }

  // Default interview type
  return getSystemPrompt("interview", false);
};

const taskPrompts = {
  interview: [
    "Let's talk about your hometown. What do you like most about it?",
    "What hobbies do you enjoy in your free time?",
    "Describe your daily routine. What do you usually do in the morning?",
    "Tell me about your family. Do you have any siblings?",
    "What kind of music do you enjoy listening to?"
  ],
  talk: [
    "Describe a memorable journey you have taken.\nYou should say:\n• where you went\n• how you traveled\n• who you traveled with\nand explain why this journey was memorable.",
    "Describe a skill you would like to learn.\nYou should say:\n• what the skill is\n• how you would learn it\n• why you want to learn it\nand explain how this skill would benefit you.",
    "Describe a person who has influenced you.\nYou should say:\n• who this person is\n• how you know them\n• what qualities they have\nand explain how they have influenced you.",
    "Describe a place you would like to visit.\nYou should say:\n• where it is\n• what you know about it\n• how you would travel there\nand explain why you want to visit this place."
  ],
  discussion: [
    "Some people believe that travel is essential for personal development. Do you agree? Why might some people disagree?",
    "How do you think technology will change education in the next 20 years? What are the potential benefits and drawbacks?",
    "What role should governments play in protecting the environment? How can individuals contribute?",
    "Do you think traditional skills are still relevant in the modern world? Why or why not?",
    "How has globalization affected local cultures? Is this change positive or negative?"
  ]
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, topic, taskType = "interview", generatePrompt = false } = await req.json();
    
    // If user wants a new prompt
    if (generatePrompt) {
      const prompts = taskPrompts[taskType as keyof typeof taskPrompts] || taskPrompts.interview;
      const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
      return new Response(
        JSON.stringify({ prompt: randomPrompt, taskType }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
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

    const systemPrompt = getSystemPrompt(taskType, false);
    
    let userMessage = `Task Type: ${taskType.charAt(0).toUpperCase() + taskType.slice(1)}`;
    if (topic) userMessage += `\nTopic/Question: ${topic}`;
    userMessage += `\n\nTranscript:\n${transcript}`;

    console.log(`Analyzing ${taskType} speaking, word count:`, transcript.split(/\s+/).length);

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

    let feedback;
    try {
      let jsonStr = content;
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      } else {
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

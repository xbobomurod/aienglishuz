import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const getSystemPrompt = (taskType: string, hasImage: boolean = false) => {
  const basePrompt = `You are an official IELTS Speaking Examiner. You score strictly with IELTS Speaking Band Descriptors only (0-9 in .5 increments). Do not use CEFR levels.

SCORING GUIDELINES:

IELTS Speaking criteria:
- Fluency and Coherence
- Lexical Resource
- Grammatical Range and Accuracy
- Pronunciation

Use concise examiner-style feedback and return valid JSON only.`;

  if (taskType === "interview") {
    return `${basePrompt}

TASK 1.1 - INTERVIEW EVALUATION:
General questions about familiar topics (hobby, study, home, work).
Focus on: Fluency, ability to expand answers, pronunciation clarity, basic vocabulary range.

Return JSON:
{
  "bandScore": <number 0-9 with .5 increments>,
  "cefrLevel": "<B1|B2|C1|C2>",
  "scoreJustification": "<brief justification>",
  "fluencyScore": <number 0-9>,
  "vocabularyScore": <number 0-9>,
  "grammarScore": <number 0-9>,
  "pronunciationScore": <number 0-9>,
  "transcriptWithHighlights": "<transcript with **bold** on errors>",
  "fillerWords": [{"word": "<filler>", "count": <n>, "suggestion": "<tip>"}],
  "vocabularyUpgrades": [{"original": "<word>", "upgrade": "<better word>", "example": "<sentence>"}],
  "grammarCorrections": [{"mistake": "<error>", "correction": "<fix>", "cefrTip": "<CEFR-specific tip>"}],
  "nativeUpgrade": "<C1 level model answer>",
  "dailyPracticeTip": "<specific exercise>",
  "overallFeedback": "<summary>"
}`;
  }

  if (taskType === "picture") {
    return `${basePrompt}

TASK 1.2 - PICTURE DESCRIPTION EVALUATION:
${hasImage ? "Evaluate their description of the provided image." : "Evaluate their description of the hypothetical scene they described."}
CRITICAL FOCUS: Use of prepositions of place (in the background, next to, in front of, behind, on the left/right, at the top/bottom, between, among).
Also evaluate: Spatial vocabulary, descriptive adjectives, present continuous for actions.

Return JSON:
{
  "bandScore": <number 0-9 with .5 increments>,
  "cefrLevel": "<B1|B2|C1|C2>",
  "scoreJustification": "<brief justification>",
  "fluencyScore": <number 0-9>,
  "vocabularyScore": <number 0-9>,
  "grammarScore": <number 0-9>,
  "spatialLanguageScore": <number 0-9>,
  "transcriptWithHighlights": "<transcript with **bold** on errors>",
  "prepositionAnalysis": {
    "used": ["<prepositions they used>"],
    "missing": ["<prepositions they could have used>"],
    "feedback": "<specific feedback on spatial language>"
  },
  "fillerWords": [{"word": "<filler>", "count": <n>, "suggestion": "<tip>"}],
  "vocabularyUpgrades": [{"original": "<word>", "upgrade": "<better word>", "example": "<sentence>"}],
  "grammarCorrections": [{"mistake": "<error>", "correction": "<fix>", "cefrTip": "<CEFR-specific tip>"}],
  "nativeUpgrade": "<C1 level model description>",
  "dailyPracticeTip": "<specific exercise for picture description>",
  "overallFeedback": "<summary>"
}`;
  }

  if (taskType === "talk") {
    return `${basePrompt}

TASK 2 - ONE MINUTE TALK EVALUATION:
User responds to a cue card for 1-2 minutes.
Focus on: Coherent extended speech, topic development, use of discourse markers, vocabulary range.

Return JSON:
{
  "bandScore": <number 0-9 with .5 increments>,
  "cefrLevel": "<B1|B2|C1|C2>",
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
  "grammarCorrections": [{"mistake": "<error>", "correction": "<fix>", "cefrTip": "<CEFR-specific tip>"}],
  "nativeUpgrade": "<C1 level model response to the same cue card>",
  "dailyPracticeTip": "<specific exercise>",
  "overallFeedback": "<summary>"
}`;
  }

  if (taskType === "discussion") {
    return `${basePrompt}

TASK 3 - DISCUSSION EVALUATION (2 minutes):
Deep analytical questions requiring abstract thinking and opinion justification.
Focus on: Complex ideas, speculation, hypothetical language, balanced arguments, advanced connectors.

Return JSON:
{
  "bandScore": <number 0-9 with .5 increments>,
  "cefrLevel": "<B1|B2|C1|C2>",
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
  "grammarCorrections": [{"mistake": "<error>", "correction": "<fix>", "cefrTip": "<CEFR-specific tip>"}],
  "nativeUpgrade": "<C1 level model discussion response>",
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
  picture: [
    "Describe a busy city street scene with people, vehicles, and buildings.",
    "Describe a peaceful park scene with people enjoying outdoor activities.",
    "Describe a classroom during a lesson with students and a teacher.",
    "Describe a family gathering or celebration scene.",
    "Describe a market or shopping area with vendors and customers."
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
    const { transcript, topic, taskType = "interview", generatePrompt = false, imageDescription } = await req.json();
    
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

    const hasImage = taskType === "picture" && imageDescription;
    const systemPrompt = getSystemPrompt(taskType, hasImage);
    
    let userMessage = `Task Type: ${taskType.charAt(0).toUpperCase() + taskType.slice(1)}`;
    if (topic) userMessage += `\nTopic/Question: ${topic}`;
    if (hasImage) userMessage += `\nImage Context: ${imageDescription}`;
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

    console.log("Speaking analyzed successfully, band score:", feedback.bandScore, "CEFR:", feedback.cefrLevel);

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

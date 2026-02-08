import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const getSystemPrompt = (taskType: string, isInformal: boolean = false) => {
  const basePrompt = `You are an expert language examiner certified in both CEFR (Multi-level) and IELTS standards. You provide dual scoring for all evaluations.

SCORING GUIDELINES:

IELTS Bands:
- Band 9: Expert user (C2)
- Band 8-8.5: Very good user (C1-C2)
- Band 7-7.5: Good user (C1)
- Band 6-6.5: Competent user (B2)
- Band 5-5.5: Modest user (B1-B2)
- Band 4-4.5: Limited user (B1)
- Band 3 and below: Very limited (A2 or below)

CEFR Levels:
- C2: Proficiency - Can express with precision, differentiate finer shades of meaning
- C1: Advanced - Can express fluently and spontaneously, use flexible and effective language
- B2: Upper-Intermediate - Can interact with degree of fluency, clear detailed text
- B1: Intermediate - Can deal with most situations, produce simple connected text`;

  if (taskType === "task1") {
    const toneGuidance = isInformal 
      ? "INFORMAL LETTER (50 words minimum): Focus on casual, friendly tone, contractions allowed, personal expressions."
      : "FORMAL LETTER (120 words minimum): Focus on professional tone, proper salutations, formal language, no contractions.";
    
    return `${basePrompt}

TASK 1 EVALUATION - ${toneGuidance}
Focus on: Purpose achievement, tone appropriateness (${isInformal ? 'informal/friendly' : 'formal/professional'}), opening and closing conventions, coherent organization.

Return JSON:
{
  "bandScore": <number 0-9 with .5 increments>,
  "cefrLevel": "<B1|B2|C1|C2>",
  "breakdown": {
    "taskAchievement": <number 0-9>,
    "coherence": <number 0-9>,
    "lexicalResource": <number 0-9>,
    "grammar": <number 0-9>
  },
  "errors": [
    {
      "mistake": "<exact phrase>",
      "correction": "<corrected version>",
      "cefrTip": "<tip at appropriate CEFR level>"
    }
  ],
  "suggestions": ["<upgrade suggestions>"],
  "overallFeedback": "<summary>",
  "modelAnswer": "<C1 level model answer for the same task>"
}`;
  }

  return `${basePrompt}

TASK 2 EVALUATION (Essay - 250 words minimum):
Focus on: Task response (addressing all parts), coherence & cohesion, lexical resource, grammatical range & accuracy.

Return JSON:
{
  "bandScore": <number 0-9 with .5 increments>,
  "cefrLevel": "<B1|B2|C1|C2>",
  "breakdown": {
    "taskResponse": <number 0-9>,
    "coherence": <number 0-9>,
    "lexicalResource": <number 0-9>,
    "grammar": <number 0-9>
  },
  "errors": [
    {
      "mistake": "<exact phrase>",
      "correction": "<corrected version>",
      "cefrTip": "<tip at appropriate CEFR level>"
    }
  ],
  "suggestions": ["<upgrade suggestions>"],
  "overallFeedback": "<summary>",
  "modelAnswer": "<C1 level model answer for the same topic>"
}`;
};

const taskPrompts = {
  task1Informal: [
    "Write an email to a friend inviting them to visit you. Describe your area, suggest activities, and propose dates.",
    "Write a letter to your friend apologizing for missing their birthday party. Explain what happened and suggest meeting up soon.",
    "Write an email to a friend asking for advice about choosing a new hobby. Mention your interests and what you're looking for.",
    "Write a letter to a close friend thanking them for the gift they sent you. Describe how you've been using it.",
    "Write an email to your roommate about sharing household chores. Be friendly but suggest a fair arrangement."
  ],
  task1Formal: [
    "Write a letter to your landlord complaining about a problem with your apartment. Include what the problem is, how it affects you, and what action you want them to take.",
    "Write a formal letter applying for a volunteer position at a local charity. Explain why you are interested and what skills you can offer.",
    "Write an email to your manager requesting time off work. Explain why you need it and how your work will be covered.",
    "Write a letter of complaint to a company about a faulty product. Describe the issue and what resolution you expect.",
    "Write a formal letter to the local council about a traffic problem in your area. Describe the issue and suggest solutions."
  ],
  task2: [
    "Some people believe that technology has made our lives more complicated. To what extent do you agree or disagree?",
    "Many cities are now banning cars from their centers. What are the advantages and disadvantages of this approach?",
    "Education should focus more on practical skills rather than academic subjects. Discuss both views and give your opinion.",
    "The rise of remote work has changed how people view the traditional office. What are the implications for the future of work?",
    "Climate change is the biggest threat facing humanity today. To what extent do you agree with this statement?"
  ]
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { essay, topic, taskType = "task2", isInformal = false, generatePrompt = false } = await req.json();
    
    // If user wants a new prompt
    if (generatePrompt) {
      let prompts: string[];
      if (taskType === "task1") {
        prompts = isInformal ? taskPrompts.task1Informal : taskPrompts.task1Formal;
      } else {
        prompts = taskPrompts.task2;
      }
      const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
      return new Response(
        JSON.stringify({ prompt: randomPrompt, taskType, isInformal }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
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

    const systemPrompt = getSystemPrompt(taskType, isInformal);
    const taskLabel = taskType === "task1" 
      ? (isInformal ? "Informal Letter (Task 1)" : "Formal Letter (Task 1)") 
      : "Essay (Task 2)";
    const userMessage = topic 
      ? `Task Type: ${taskLabel}\nTopic: ${topic}\n\nSubmission:\n${essay}`
      : `Task Type: ${taskLabel}\n\nSubmission:\n${essay}`;

    console.log(`Grading ${taskType} (${isInformal ? 'informal' : 'formal'}), word count:`, essay.split(/\s+/).length);

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

    console.log("Essay graded successfully, band score:", feedback.bandScore, "CEFR:", feedback.cefrLevel);

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

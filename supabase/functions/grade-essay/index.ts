import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const getSystemPrompt = (taskType: string) => {
  const basePrompt = `You are an official IELTS Writing examiner. You score strictly using the public IELTS Band Descriptors (0-9, in .5 increments). Do not use alternative level systems.

IELTS Band Descriptors (overview):
- Band 9: Expert user — fully operational command, accurate, appropriate, fluent.
- Band 8: Very good user — fully operational with only occasional unsystematic inaccuracies.
- Band 7: Good user — operational command, occasional inaccuracies, handles complex language well.
- Band 6: Competent user — generally effective despite some inaccuracies.
- Band 5: Modest user — partial command, many mistakes, basic communication.
- Band 4: Limited user — basic competence in familiar situations only.
- Band 3 and below: Extremely limited or non-user.`;

  if (taskType === "task1") {
    return `${basePrompt}

TASK 1 EVALUATION — IELTS ACADEMIC WRITING TASK 1 (150+ words, 20 minutes recommended):
The candidate describes visual information (graph, chart, table, diagram, map or process) in their own words.
Score using the four official Task 1 criteria, each weighted equally:
1. Task Achievement — selects and reports key features, accurate data, clear overview.
2. Coherence and Cohesion — logical organisation, paragraphing, cohesive devices.
3. Lexical Resource — range, accuracy, appropriate paraphrase of the prompt.
4. Grammatical Range and Accuracy — variety of structures, error-free sentences.
Penalise: under 150 words; copying prompt verbatim; opinions/personal commentary; lack of overview.

Return JSON:
{
  "bandScore": <number 0-9 with .5 increments>,
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
      "tip": "<short improvement tip mapped to a band descriptor>"
    }
  ],
  "suggestions": ["<concrete band-up suggestions>"],
  "overallFeedback": "<summary referencing band descriptors>",
  "modelAnswer": "<Band 8+ model answer (150-180 words) for the same prompt>"
}`;
  }

  return `${basePrompt}

TASK 2 EVALUATION — IELTS WRITING TASK 2 (250+ words, 40 minutes recommended):
Score using the four official Task 2 criteria, each weighted equally:
1. Task Response — addresses all parts of the question, clear position, developed ideas.
2. Coherence and Cohesion — paragraphing, progression, cohesive devices.
3. Lexical Resource — range, precision, collocation, paraphrasing.
4. Grammatical Range and Accuracy — varied structures, error-free sentences.
Penalise: under 250 words; off-topic; memorised content; lack of position.

Return JSON:
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
      "mistake": "<exact phrase>",
      "correction": "<corrected version>",
      "tip": "<short improvement tip mapped to a band descriptor>"
    }
  ],
  "suggestions": ["<concrete band-up suggestions>"],
  "overallFeedback": "<summary referencing band descriptors>",
  "modelAnswer": "<Band 8+ model answer (around 270 words) for the same topic>"
}`;
};

const taskPrompts = {
  task1: [
    `The line graph below shows the percentage of households with internet access in three countries between 2000 and 2020.

Year | UK | Germany | Japan
2000 | 38% | 31% | 22%
2005 | 55% | 47% | 39%
2010 | 73% | 68% | 61%
2015 | 86% | 80% | 77%
2020 | 94% | 91% | 89%

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.`,
    `The bar chart below shows the number of international students enrolled at four universities in 2010 and 2020.

University | 2010 | 2020
Northbridge | 1,200 | 2,850
Eastford | 950 | 1,600
Westmere | 1,750 | 2,100
Southgate | 650 | 1,950

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.`,
    `The table below shows the proportion of energy produced from different sources in four countries in 2020.

Country | Coal | Natural gas | Nuclear | Renewables
Australia | 54% | 21% | 0% | 25%
France | 5% | 9% | 67% | 19%
Germany | 24% | 18% | 11% | 47%
Canada | 8% | 27% | 15% | 50%

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.`,
    `The process diagram below shows how plastic bottles are recycled.

Used bottles → Collection bins → Sorting centre → Crushing → Washing → Plastic pellets → Heating and melting → New products

Summarise the information by selecting and reporting the main stages of the process.`,
    `The pie charts below show household spending in one country in 1990 and 2020.

Category | 1990 | 2020
Food | 32% | 18%
Housing | 22% | 34%
Transport | 14% | 19%
Healthcare | 8% | 13%
Leisure | 12% | 10%
Other | 12% | 6%

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.`
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
    const { essay, topic, taskType = "task2", generatePrompt = false } = await req.json();

    // If user wants a new prompt
    if (generatePrompt) {
      const prompts = taskType === "task1" ? taskPrompts.task1 : taskPrompts.task2;
      const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
      return new Response(
        JSON.stringify({ prompt: randomPrompt, taskType }),
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

    const systemPrompt = getSystemPrompt(taskType);
    const taskLabel = taskType === "task1" ? "IELTS Academic Task 1" : "IELTS Task 2 Essay";
    const userMessage = topic
      ? `Task Type: ${taskLabel}\nPrompt: ${topic}\n\nCandidate response:\n${essay}`
      : `Task Type: ${taskLabel}\n\nCandidate response:\n${essay}`;

    console.log(`Grading ${taskType}, word count:`, essay.split(/\s+/).length);

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

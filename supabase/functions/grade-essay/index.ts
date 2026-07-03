import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ESSAY_CHARS = 8000; // ~1500 words, safely above IELTS Task 2 max
const MAX_TOPIC_CHARS = 2000;

async function requireAuth(req: Request): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return { userId: data.claims.sub as string };
}

const getSystemPrompt = (taskType: string) => {
  const basePrompt = `You are a senior, certified IELTS Writing examiner who has marked tens of thousands of Academic Task 1 and Task 2 scripts. You apply the official public IELTS Writing Band Descriptors verbatim — 0 to 9 in .5 increments — and you mark strictly. Do NOT use CEFR, TOEFL, or invented scales.

ANCHOR DESCRIPTORS YOU MUST USE FOR EACH CRITERION (0–9, .5 steps):
• Band 9 — Fully addresses all parts; cohesion natural and unobtrusive; wide range of vocabulary used naturally and with sophisticated control; wide range of structures, full flexibility and accuracy, rare minor errors only as slips.
• Band 8 — Sufficiently addresses all parts with well-developed ideas; sequences information logically, manages all aspects of cohesion well; wide vocabulary used fluently with rare inappropriacy; wide range of structures, the majority error-free, only occasional errors.
• Band 7 — Addresses all parts of the task with clear position/overview throughout; logically organised, clear progression, uses a range of cohesive devices appropriately (may over/under-use); sufficient range of vocabulary with some flexibility and precision; uses a variety of complex structures, frequent error-free sentences, has good control with few errors.
• Band 6 — Addresses the task with relevant ideas (may be inadequately developed); arranges information coherently with clear overall progression, cohesive devices sometimes mechanical; adequate range of vocabulary; mix of simple and complex sentences with some errors that rarely reduce communication.
• Band 5 — Addresses the task only partially, format may be inappropriate, position unclear; some organisation but inadequate, repetitive or inaccurate cohesion; limited vocabulary, noticeable errors in word choice and spelling; limited range of structures, frequent grammatical errors that may cause some difficulty.
• Band 4 — Attempts to address the task but does not cover all key features, position unclear; information not arranged coherently, no clear progression; only basic vocabulary which may be used repetitively; very limited range of structures, errors predominate.
• Band 3 and below — Does not adequately address task / fails to communicate any message; very few sentences, almost no control.

SCORING METHOD (mandatory):
1. Score each of the four criteria independently from 0–9 in 0.5 steps using the anchors above.
2. Final bandScore = average of the four criterion scores, then ROUND to the nearest 0.5 using IELTS convention:
   - .25 rounds UP to .5
   - .75 rounds UP to next whole number
   - everything else rounds to nearest .5
3. Word-count penalties (apply BEFORE final averaging):
   - Task 1 < 150 words OR Task 2 < 250 words → cap Task Achievement / Task Response at 5.0.
   - Below 100 words (Task 1) or 200 words (Task 2) → cap TA/TR at 4.0.
   - Off-topic / memorised / generic content not addressing the prompt → cap TA/TR at 4.0.
4. Be strict — do not inflate. A typical international candidate response sits at Band 5.5–6.5, not 7+.
5. Cite at least 3 specific extracts from the candidate text in your errors list, even at high bands.`;

  if (taskType === "task1") {
    return `${basePrompt}

TASK 1 EVALUATION — IELTS ACADEMIC WRITING TASK 1 (150+ words, 20 minutes):
The candidate describes visual information (line graph, bar chart, pie chart, table, diagram, map, or process) in their own words.

Criteria, equally weighted:
1. Task Achievement — selects and reports the KEY features only (no minor detail dump); has a clear overview paragraph (usually paragraph 2); reports accurate data with units; makes appropriate comparisons; never expresses an opinion.
2. Coherence and Cohesion — paragraphing (intro paraphrase / overview / 2 body paras); referencing; range of linking devices used naturally.
3. Lexical Resource — paraphrases the prompt, uses topic-specific vocabulary (e.g. "rose steadily", "fluctuated", "peaked at", "outstripped", "the proportion of"), avoids repetition.
4. Grammatical Range and Accuracy — varied tenses (past/present perfect for past data, future for projections), comparatives/superlatives, passive voice for processes, complex sentences.

Major penalties: under 150 words; copying prompt verbatim; expressing an opinion; missing overview; inventing data not in the prompt.

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

TASK 2 EVALUATION — IELTS WRITING TASK 2 ESSAY (250+ words, 40 minutes):

Criteria, equally weighted:
1. Task Response — addresses every part of the prompt (opinion / both views / problem-solution / two-part); presents AND develops a clear position with relevant, extended, supported ideas (specific examples, not generalisations); reaches a conclusion that matches the introduction.
2. Coherence and Cohesion — 4–5 clear paragraphs (intro / 2 body / conclusion), each with one central idea and a topic sentence; cohesive devices used flexibly ("Whereas", "On the other hand", "A further consideration is...", "This is largely because"); references and substitutions used naturally.
3. Lexical Resource — wide range, precise collocations ("pose a serious threat", "tackle the issue", "wide-ranging consequences"), avoids basic vocabulary repetition, occasional less-common idiomatic phrases with awareness of style and collocation.
4. Grammatical Range and Accuracy — wide range of complex structures (conditionals, relative clauses, participle phrases, passives, cleft sentences, modals of speculation), the majority of sentences error-free, punctuation accurate.

Major penalties: under 250 words; off-topic; memorised model essays; no clear position; one-sided when both views asked; missing conclusion.

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
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;

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

    if (typeof essay !== "string" || essay.length > MAX_ESSAY_CHARS) {
      return new Response(
        JSON.stringify({ error: `Essay too long (max ${MAX_ESSAY_CHARS} characters).` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (topic && (typeof topic !== "string" || topic.length > MAX_TOPIC_CHARS)) {
      return new Response(
        JSON.stringify({ error: "Topic too long." }),
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
        "Lovable-API-Key": LOVABLE_API_KEY,
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

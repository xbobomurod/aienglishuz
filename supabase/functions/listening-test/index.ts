import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ANSWERS = 50;
const MAX_ANSWER_CHARS = 500;

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

interface Question {
  id: number;
  type: "multiple-choice" | "fill-blank" | "matching";
  question: string;
  options?: string[];
  correctAnswer: string;
}

interface ListeningTest {
  topic: string;
  scenario: string;
  transcript: string;
  questions: Question[];
}

const normalizeAnswer = (value: unknown) =>
  (value || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\b(pounds?|minutes?|pm|a\.m\.|p\.m\.)\b/g, (match) => match.replace(/\./g, ""))
    .replace(/[^a-z0-9\s:.'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isAnswerCorrect = (userAnswer: unknown, correctAnswer: unknown) => {
  const userAns = normalizeAnswer(userAnswer);
  const correctAns = normalizeAnswer(correctAnswer);

  if (!userAns || !correctAns) return false;
  if (userAns === correctAns) return true;

  const withoutArticles = (value: string) => value.replace(/^(a|an|the)\s+/, "").trim();
  if (withoutArticles(userAns) === withoutArticles(correctAns)) return true;

  const compactUser = userAns.replace(/[\s:.'-]/g, "");
  const compactCorrect = correctAns.replace(/[\s:.'-]/g, "");
  return compactUser.length > 1 && compactUser === compactCorrect;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;

    const { action, userAnswers, correctAnswers, totalQuestions, section, fastMode, fastWordCount, fastQuestionCount } = await req.json();

    if (action === "score") {
      if (!Array.isArray(userAnswers) || !Array.isArray(correctAnswers) ||
          userAnswers.length > MAX_ANSWERS || correctAnswers.length > MAX_ANSWERS ||
          typeof totalQuestions !== "number" || totalQuestions > MAX_ANSWERS) {
        return new Response(JSON.stringify({ error: "Invalid answers payload" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      for (const a of [...userAnswers, ...correctAnswers]) {
        if (a != null && typeof a === "string" && a.length > MAX_ANSWER_CHARS) {
          return new Response(JSON.stringify({ error: "Answer too long" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }

    // Generate a new listening test
    if (action === "generate") {
      const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

      if (!GROQ_API_KEY) {
        console.error("GROQ_API_KEY not configured");
        return new Response(
          JSON.stringify({ error: "API key not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Generating listening test for section:", section);

      const sectionType = section || "full-test";
      const isFastPractice = Boolean(fastMode);
      const isFullTest = sectionType === "full-test" && !isFastPractice;
      const promptSectionType = isFastPractice && sectionType === "full-test" ? "1" : sectionType;
      const customWordTarget = isFastPractice && Number.isFinite(fastWordCount) ? Math.max(120, Math.min(400, Number(fastWordCount))) : null;
      const customQuestionTarget = isFastPractice && Number.isFinite(fastQuestionCount) ? Math.max(3, Math.min(10, Math.round(Number(fastQuestionCount)))) : null;
      let scenarioDescription = "";
      let questionCount = isFullTest ? 40 : isFastPractice ? (customQuestionTarget ?? 6) : 10;
      const fastWordRange = customWordTarget ? `${Math.max(80, customWordTarget - 40)}-${customWordTarget + 40}` : "160-220";

      switch (promptSectionType) {
        case "full-test":
          scenarioDescription = "A complete IELTS Listening test: Section 1 everyday conversation, Section 2 social monologue, Section 3 educational discussion, Section 4 academic lecture";
          break;
        case "1":
          scenarioDescription = "A conversation between two people in an everyday social context (e.g., booking a hotel, making an appointment, discussing travel plans)";
          break;
        case "2":
          scenarioDescription = "A monologue in an everyday social context (e.g., a tour guide describing attractions, a radio announcement about local events)";
          break;
        case "3":
          scenarioDescription = "A conversation between up to four people in an educational or training context (e.g., university students discussing a project)";
          break;
        case "4":
          scenarioDescription = "A monologue on an academic subject (e.g., a university lecture excerpt)";
          break;
        default:
          scenarioDescription = "A conversation in an everyday context";
      }

      const systemPrompt = `You are a senior Cambridge IELTS Listening test writer. You have internalised every transcript and question pattern from Cambridge IELTS books 10–18. Mimic that style exactly.

${isFullTest ? "Full IELTS Listening test" : `Section ${promptSectionType}`} scenario: ${scenarioDescription}

Generate ${isFullTest ? "four labelled transcripts (SECTION 1–4) with realistic speaker labels and" : isFastPractice ? `a short realistic dialogue/monologue transcript (${fastWordRange} words) and` : "a realistic dialogue/monologue transcript (250–350 words) and"} ${questionCount} questions.

SECTION CHARACTER (must match real Cambridge):
- SECTION 1: a 2-person transactional conversation in a social/everyday context — booking accommodation, phoning a council, joining a club, hiring a service. One speaker is asking, the other giving information. Question type: form / note / table completion (write words OR numbers). Easy difficulty.
- SECTION 2: a monologue in a non-academic social context — local radio piece, museum/tour guide, instructions about facilities. Question types: matching, map/plan labelling, multiple choice. Medium difficulty.
- SECTION 3: a discussion between 2–4 speakers in an academic/training context — students with a tutor planning an assignment, choosing dissertation topics. Question types: multiple choice, matching options, classification, flow-chart completion. Hard difficulty.
- SECTION 4: a single-speaker academic lecture (university style). Question type: note completion or sentence completion. Hardest difficulty, no breaks.

TRANSCRIPT QUALITY:
- Speaker labels at start of each turn ONLY as metadata: AGENT:, CALLER:, TOUR GUIDE:, TUTOR:, STUDENT A:, STUDENT B:, LECTURER:. Never write "the agent says" inside speech.
- Use natural British English with contractions ("I'd", "wouldn't", "let me check"), discourse markers ("right", "actually", "so", "as I was saying"), false starts, polite hedges, mild self-correction ("sorry — it's twenty-five, not thirty-five").
- Include specific testable details: postcodes, phone numbers ("oh-double-seven", "triple-three"), times, prices in pounds, proper names spelled out ("It's B-R-O-W-N-E with an E"), dates, building/room numbers.
- For SECTION 1, include at least 3 numbers/spelled words. For SECTION 4, include 2 named studies or theories.
- No stage directions, no [pause], no [laughs], no music cues.

QUESTION RULES:
- Order of questions follows the order of the transcript exactly.
- Fill-blank answers must be 1–3 words copied EXACTLY as said in the transcript (including British spelling). State "NO MORE THAN THREE WORDS AND/OR A NUMBER" in the question when appropriate.
- Multiple choice: 3 or 4 options labelled "A) ..." through "D) ...". correctAnswer must be a single letter.
- Distractors must reflect REAL listening traps: a speaker first says X then corrects to Y (the answer is Y, distractor is X); two options sound similar (fifteen vs. fifty); a fact mentioned about someone else.
- Spelling matters: use British spelling (colour, programme, organisation) and put correct capitalisation on proper nouns and days/months.
- Numbers as digits ("3:30 pm", "£45", "07700 900123") unless the speaker spells them out.

For a FULL TEST, create exactly 40 questions: 10 per section.

You MUST respond with ONLY valid JSON in this exact format:
{
  "topic": "Brief topic title",
  "scenario": "Brief description of the setting and speakers",
  "transcript": "The full transcript. For a full test, label SECTION 1, SECTION 2, SECTION 3, SECTION 4 clearly, with speaker labels where appropriate...",
  "questions": [
    {
      "id": 1,
      "type": "fill-blank",
      "question": "Complete the note (NO MORE THAN THREE WORDS AND/OR A NUMBER): The appointment is scheduled for _____ on Tuesday.",
      "correctAnswer": "3:30 PM"
    },
    {
      "id": 2,
      "type": "multiple-choice",
      "question": "What is the main purpose of the call?",
      "options": ["A) To book a table", "B) To make a complaint", "C) To ask for directions", "D) To change a reservation"],
      "correctAnswer": "A"
    }
  ]
}`;

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Generate a new IELTS Listening Section ${promptSectionType} test. Return only valid JSON.` }
          ],
          temperature: 0.85,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI Gateway error:", response.status, errorText);
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw new Error(`AI Gateway error: ${response.status}`);
      }

      const data = await response.json();
      let content = data.choices?.[0]?.message?.content || "";
      
      // Clean up the response
      content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) content = jsonMatch[0];
      
      try {
        const test: ListeningTest = JSON.parse(content.replace(/[ --]/g, ""));
        if (isFastPractice) test.questions = test.questions.slice(0, questionCount);
        test.transcript = test.transcript
          .replace(/^\s*(AGENT|CUSTOMER|GUIDE|TUTOR|LECTURER|STUDENT\s*[A-D]?|SPEAKER\s*[A-D]?|MAN|WOMAN)\s+says[:,]?\s*/gim, "$1: ")
          .replace(/\[(?:laughs?|pause|sighs?|music|noise|silence|hesitates?)\]/gi, "")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
        console.log("Generated listening test with", test.questions?.length, "questions");
        return new Response(
          JSON.stringify(test),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (parseError) {
        console.error("Failed to parse AI response:", content);
        throw new Error("Failed to parse generated test");
      }
    }

    // Score the test
    if (action === "score") {
      console.log("Scoring listening test");

      let correctCount = 0;
      const results: { questionId: number; correct: boolean; userAnswer: string; correctAnswer: string }[] = [];

      for (let i = 0; i < totalQuestions; i++) {
        const isCorrect = isAnswerCorrect(userAnswers[i], correctAnswers[i]);
        
        if (isCorrect) correctCount++;
        
        results.push({
          questionId: i + 1,
          correct: isCorrect,
          userAnswer: userAnswers[i] || "",
          correctAnswer: correctAnswers[i] || ""
        });
      }

      // IELTS band score calculation
      const percentage = (correctCount / totalQuestions) * 100;
      let bandScore: number;
      
      if (percentage >= 90) bandScore = 9.0;
      else if (percentage >= 85) bandScore = 8.5;
      else if (percentage >= 80) bandScore = 8.0;
      else if (percentage >= 75) bandScore = 7.5;
      else if (percentage >= 70) bandScore = 7.0;
      else if (percentage >= 65) bandScore = 6.5;
      else if (percentage >= 60) bandScore = 6.0;
      else if (percentage >= 55) bandScore = 5.5;
      else if (percentage >= 50) bandScore = 5.0;
      else if (percentage >= 40) bandScore = 4.5;
      else if (percentage >= 30) bandScore = 4.0;
      else bandScore = 3.5;

      const feedback = percentage >= 80
        ? "Strong listening performance. Keep practicing distractor recognition and exact spelling so you can protect high-band accuracy under time pressure."
        : percentage >= 60
          ? "Good progress. Focus on names, numbers, dates, and paraphrases, then replay missed sections to understand the distractors."
          : "Build accuracy with shorter sections first. Listen for keywords, write answers immediately, and review the transcript after each attempt.";

      return new Response(
        JSON.stringify({
          correctCount,
          totalQuestions,
          bandScore,
          percentage,
          results,
          feedback
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in listening-test function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

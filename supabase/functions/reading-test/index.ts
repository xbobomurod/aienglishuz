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
  type: "multiple-choice" | "true-false-not-given" | "fill-blank" | "matching";
  question: string;
  options?: string[];
  correctAnswer: string;
  evidenceQuote?: string;
}

interface ReadingTest {
  topic: string;
  passage: string;
  questions: Question[];
}

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const validateReadingTest = (test: ReadingTest, expectedQuestions: number) => {
  const passage = normalizeText(test.passage || "");
  if (!test.topic || passage.length < 1200 || !Array.isArray(test.questions)) {
    throw new Error("Generated reading test was incomplete");
  }
  if (test.questions.length !== expectedQuestions) {
    throw new Error(`Expected ${expectedQuestions} questions, got ${test.questions.length}`);
  }

  test.questions.forEach((question, index) => {
    if (question.id !== index + 1) question.id = index + 1;
    if (!question.question || !question.correctAnswer) {
      throw new Error(`Question ${index + 1} is missing required fields`);
    }

    const quote = normalizeText(question.evidenceQuote || "");
    if (quote.length < 16 || !passage.includes(quote)) {
      throw new Error(`Question ${index + 1} does not cite an exact passage quote`);
    }

    if (["multiple-choice", "matching"].includes(question.type) && (!question.options || question.options.length < 3)) {
      throw new Error(`Question ${index + 1} is missing answer options`);
    }
  });
};

const extractJsonObject = (rawContent: string) => {
  let content = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  return jsonMatch ? jsonMatch[0] : content;
};

const escapeControlCharactersInsideStrings = (json: string) => {
  let repaired = "";
  let inString = false;
  let escaped = false;

  for (const char of json) {
    if (escaped) {
      repaired += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      repaired += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      repaired += char;
      inString = !inString;
      continue;
    }

    const code = char.charCodeAt(0);
    if (inString && (code <= 0x1f || code === 0x7f)) {
      if (char === "\n") repaired += "\\n";
      else if (char === "\r") repaired += "\\r";
      else if (char === "\t") repaired += "\\t";
      else if (char === "\b") repaired += "\\b";
      else if (char === "\f") repaired += "\\f";
      continue;
    }

    if (!inString && ((code <= 0x1f && ![0x09, 0x0a, 0x0d, 0x20].includes(code)) || code === 0x7f)) {
      continue;
    }

    repaired += char;
  }

  return repaired;
};

const parseAiJson = <T>(rawContent: string): T => {
  const content = extractJsonObject(rawContent);
  return JSON.parse(escapeControlCharactersInsideStrings(content)) as T;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;

    const { action, userAnswers, correctAnswers, totalQuestions, difficulty, fastMode, fastWordCount, fastQuestionCount } = await req.json();

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

    // Generate a new reading test
    if (action === "generate") {
      const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

      if (!GROQ_API_KEY) {
        console.error("GROQ_API_KEY not configured");
        return new Response(
          JSON.stringify({ error: "API key not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Generating reading test with difficulty:", difficulty);

      const difficultyLevel = difficulty || "full-test";
      const isFastPractice = Boolean(fastMode);
      const isFullTest = difficultyLevel === "full-test" && !isFastPractice;
      const customWordTarget = isFastPractice && Number.isFinite(fastWordCount) ? Math.max(250, Math.min(900, Number(fastWordCount))) : null;
      const customQuestionTarget = isFastPractice && Number.isFinite(fastQuestionCount) ? Math.max(3, Math.min(13, Math.round(Number(fastQuestionCount)))) : null;
      const fastWordRange = customWordTarget ? `${Math.max(150, customWordTarget - 60)}-${customWordTarget + 60}` : "420-520";
      const wordCount = isFullTest ? "1600-1900 total across three passages" : isFastPractice ? fastWordRange : difficultyLevel === "passage-1" ? "650-750" : difficultyLevel === "passage-3" ? "800-900" : "700-800";
      const passageLabel = isFastPractice ? "Fast IELTS Reading Practice" : isFullTest ? "Full IELTS Academic Reading Test" : difficultyLevel === "passage-1" ? "IELTS Passage 1" : difficultyLevel === "passage-3" ? "IELTS Passage 3" : "IELTS Passage 2";

      const systemPrompt = `You are a senior Cambridge IELTS Academic Reading test writer. You have internalised every passage and question pattern from Cambridge IELTS books 10 through 18 and the official IELTS examiner band descriptors. Mimic that exact style, register, and difficulty curve.

TASK: Generate ${isFullTest ? "three academic reading passages and 40 questions total" : isFastPractice ? `one focused academic reading passage and ${customQuestionTarget ?? 8} questions` : "one academic reading passage and 13 questions"}.

SOURCE STYLE — match these REAL Cambridge sources only:
- New Scientist / Scientific American style feature article (science, biology, climate, archaeology, psychology)
- Encyclopedia Britannica style entry (history, geography, social science)
- Quality broadsheet long-read (The Economist, The Guardian Long Read) — but never opinion pieces
- University extension reader chapter (education, economics, anthropology)
Do NOT write textbook summaries, blog posts, listicles, or AI-generated-feeling text.

PASSAGE QUALITY (non-negotiable):
- Length: ${wordCount}. Academic, objective register. Third person. No "we", no "I", no rhetorical questions.
- Include named researchers, real-looking institutions, specific years, percentages, country names, two contrasting viewpoints, and at least one cause/effect chain.
- Paragraphs labelled A, B, C, D, ... (single passage: 6–9 paragraphs; full test: 7–9 paragraphs per passage).
- For a full test, use the headings: PASSAGE 1 / PASSAGE 2 / PASSAGE 3 — Passage 1 easier, Passage 2 medium, Passage 3 hardest with abstract argument.
- Use natural cohesion: "Despite this", "By contrast", "What is more striking", "A subsequent study found...".
- Do NOT make answers depend on outside knowledge or common sense.

QUESTION DISTRIBUTION — follow real Cambridge mixes. For a SINGLE passage (13 questions) choose ONE of these mixes:
 • Mix A: 4 matching headings + 5 true/false/not given + 4 sentence completion
 • Mix B: 4 multiple choice + 5 true/false/not given + 4 summary/sentence completion
 • Mix C: 5 matching (paragraph contains information) + 4 yes/no/not given + 4 short answer / completion
For a FULL TEST (40 questions): Passage 1 = 13, Passage 2 = 13, Passage 3 = 14, with the hardest matching/MCQs concentrated in Passage 3.

TRUE/FALSE/NOT GIVEN — strict examiner rules:
- TRUE = statement agrees with information in the passage.
- FALSE = statement contradicts information in the passage.
- NOT GIVEN = there is no information about this in the passage. Reader cannot prove or disprove.
- correctAnswer MUST be exactly one of: "True", "False", "Not Given" (capitalised, full words, no abbreviations).
- options array MUST be exactly ["True", "False", "Not Given"].

MULTIPLE CHOICE:
- 4 options labelled "A) ...", "B) ...", "C) ...", "D) ..." each plausible but only one supported by the passage.
- Distractors should be: (a) true in real life but not stated in passage, (b) partially true, (c) the opposite of what passage says.
- correctAnswer MUST be a single letter: "A" | "B" | "C" | "D".

MATCHING HEADINGS:
- 6–8 headings provided, more than paragraphs (Roman numerals i, ii, iii would be ideal but use letters A–H).
- Each question = one paragraph letter. correctAnswer = letter of the matching heading.

SENTENCE/SUMMARY COMPLETION & SHORT ANSWER:
- Answers must be 1–3 words copied EXACTLY from the passage. State "NO MORE THAN THREE WORDS" hint inside the question.
- correctAnswer must be the exact word/phrase as it appears in the passage.

EVIDENCE RULE (mandatory): every question MUST include evidenceQuote: an 8–25 word exact substring copied character-for-character from the passage that proves the correct answer. If you cannot produce one, rewrite the question.

You MUST respond with ONLY valid JSON in this exact format:
{
  "topic": "Brief topic title",
  "passage": "Use headings: PASSAGE 1, PASSAGE 2, PASSAGE 3 when generating a full test. Include the full passage text here...",
  "questions": [
    {
      "id": 1,
      "type": "multiple-choice",
      "question": "Question text",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correctAnswer": "A",
      "evidenceQuote": "Exact short quote copied from the passage proving the answer"
    },
    {
      "id": 2,
      "type": "true-false-not-given",
      "question": "Statement to evaluate (TRUE / FALSE / NOT GIVEN)",
      "options": ["True", "False", "Not Given"],
      "correctAnswer": "True",
      "evidenceQuote": "Exact short quote copied from the passage proving True/False, or exact area showing Not Given context"
    },
    {
      "id": 3,
      "type": "fill-blank",
      "question": "Complete the sentence using NO MORE THAN THREE WORDS from the passage: The main cause was _____.",
      "correctAnswer": "specific word or phrase",
      "evidenceQuote": "Exact sentence fragment copied from the passage containing the answer"
    },
    {
      "id": 4,
      "type": "matching",
      "question": "Match the paragraph with the heading: Paragraph B",
      "options": ["A) Early commercial failure", "B) A change in public attitudes", "C) New evidence from field studies", "D) Future research priorities"],
      "correctAnswer": "C",
      "evidenceQuote": "Exact short quote copied from Paragraph B proving the heading"
    }
  ]
}

Difficulty level: ${passageLabel}.
Progressive difficulty within each passage: first questions easier (scanning), last questions harder (paraphrase, inference, opinion-vs-fact).`;

      const expectedQuestionCount = isFullTest ? 40 : isFastPractice ? (customQuestionTarget ?? 8) : 13;
      let lastParseError = "";

      for (let attempt = 1; attempt <= (isFastPractice ? 1 : 2); attempt++) {
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
            { role: "user", content: `Generate a new ${passageLabel} reading test. Return only valid JSON. Attempt ${attempt}: make sure every question has an exact evidenceQuote copied from the passage.` }
          ],
          temperature: 0.45,
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
        const test: ReadingTest = JSON.parse(content.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ""));
        test.passage = test.passage
          .replace(/\n{3,}/g, "\n\n")
          .replace(/(^|\n)(PASSAGE\s+\d)/gi, "$1$2")
          .trim();
        validateReadingTest(test, expectedQuestionCount);
        console.log("Generated test with", test.questions?.length, "questions");
        return new Response(
          JSON.stringify(test),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (parseError) {
        lastParseError = parseError instanceof Error ? parseError.message : "Failed to parse generated test";
        console.error("Failed to parse AI response:", content);
        if (attempt === 2) throw new Error(lastParseError);
      }
      }

      throw new Error(lastParseError || "Failed to generate a validated reading test");
    }

    // Score the test
    if (action === "score") {
      console.log("Scoring reading test");

      let correctCount = 0;
      const results: { questionId: number; correct: boolean; userAnswer: string; correctAnswer: string }[] = [];

      for (let i = 0; i < totalQuestions; i++) {
        const normalize = (v: unknown) =>
          (v || "")
            .toString()
            .toLowerCase()
            .trim()
            // collapse T/F shortcuts and NG variations to the canonical full form
            .replace(/^t$/, "true")
            .replace(/^f$/, "false")
            .replace(/^ng$/, "not given")
            .replace(/^n\/g$/, "not given")
            .replace(/\s+/g, " ");
        const userAns = normalize(userAnswers[i]);
        const correctAns = normalize(correctAnswers[i]);
        const isCorrect = userAns === correctAns;
        
        if (isCorrect) correctCount++;
        
        results.push({
          questionId: i + 1,
          correct: isCorrect,
          userAnswer: userAnswers[i] || "",
          correctAnswer: correctAnswers[i] || ""
        });
      }

      // IELTS band score calculation (out of 40 questions scaled to 10)
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
        ? "Strong reading accuracy. Keep improving speed by scanning for evidence quotes before choosing the final answer."
        : percentage >= 60
          ? "Good progress. Review every wrong answer against the evidence quote and practice paraphrase matching."
          : "Focus on question keywords, paragraph scanning, and exact evidence. Start with single passages before full tests.";

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
    console.error("Error in reading-test function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

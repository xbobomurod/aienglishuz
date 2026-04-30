import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const { action, userAnswers, correctAnswers, totalQuestions, section, fastMode } = await req.json();

    // Generate a new listening test
    if (action === "generate") {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

      if (!LOVABLE_API_KEY) {
        console.error("LOVABLE_API_KEY not configured");
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
      let scenarioDescription = "";
      let questionCount = isFullTest ? 40 : isFastPractice ? 6 : 10;

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

      const systemPrompt = `You are an IELTS Listening test generator. Create authentic IELTS-style listening scripts with questions.

${isFullTest ? "Full IELTS Listening test" : `Section ${promptSectionType}`} scenario: ${scenarioDescription}

Generate ${isFullTest ? "four labelled transcripts (SECTION 1-4) with realistic speaker labels and" : isFastPractice ? "a short realistic dialogue/monologue transcript (160-220 words) and" : "a realistic dialogue/monologue transcript (250-350 words) and"} ${questionCount} questions.

You MUST respond with ONLY valid JSON in this exact format:
{
  "topic": "Brief topic title",
  "scenario": "Brief description of the setting and speakers",
  "transcript": "The full transcript. For a full test, label SECTION 1, SECTION 2, SECTION 3, SECTION 4 clearly, with speaker labels where appropriate...",
  "questions": [
    {
      "id": 1,
      "type": "fill-blank",
      "question": "The appointment is scheduled for _____ on Tuesday.",
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
}

Include authentic IELTS question types:
- Form/note/table completion
- Multiple choice
- Matching
- Sentence completion
- Short answer

For a full test, create exactly 40 questions: 10 questions per section.

Transcript rules:
- Use speaker labels only as metadata at the start of each turn, e.g. AGENT:, CUSTOMER:, GUIDE:, STUDENT A:. Do not write "Agent says" or "Customer says" in the spoken text.
- For Section 1, use exactly two speakers with contrasting roles such as AGENT and CUSTOMER.
- For Section 3, use 2-4 speakers with clear labels such as TUTOR, STUDENT A, STUDENT B.
- Do not include stage directions, bracketed emotions, sound effects, or narration that should not be spoken.
- Make the speech natural and emotionally believable while staying IELTS-appropriate: brief hesitation, polite interruption, mild surprise, clarification requests, enthusiasm, uncertainty, and discourse markers like "actually", "right", "let me check", and "that's helpful".
- Add punctuation that supports expressive listening: commas, dashes, ellipses, and question marks.
Include specific details that can be tested.
Ensure all answers are clearly stated in the transcript.`;

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
        const test: ListeningTest = JSON.parse(content);
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

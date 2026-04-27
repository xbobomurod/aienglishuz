import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, userAnswers, correctAnswers, totalQuestions, difficulty } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a new reading test
    if (action === "generate") {
      console.log("Generating reading test with difficulty:", difficulty);

      const difficultyLevel = difficulty || "full-test";
      const isFullTest = difficultyLevel === "full-test";
      const wordCount = isFullTest ? "1800-2400 total across three passages" : difficultyLevel === "passage-1" ? "700-800" : difficultyLevel === "passage-3" ? "850-950" : "750-850";
      const passageLabel = isFullTest ? "Full IELTS Academic Reading Test" : difficultyLevel === "passage-1" ? "IELTS Passage 1" : difficultyLevel === "passage-3" ? "IELTS Passage 3" : "IELTS Passage 2";

      const systemPrompt = `You are an IELTS Reading test generator. Create authentic IELTS-style reading passages with questions.

Generate ${isFullTest ? "three academic reading passages and 40 questions total" : "one academic reading passage and 13-14 questions"}. The passage content should be ${wordCount}, academic in tone, and cover topics like science, history, social issues, or technology.

Critical quality requirement: write the passage first, then write questions ONLY from facts, claims, names, dates, numbers, causes, contrasts, or paragraph ideas that are explicitly present in that passage. Do not invent any answer, heading, option, or statement that cannot be proven by the passage text.

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
      "question": "Statement to evaluate",
      "options": ["True", "False", "Not Given"],
      "correctAnswer": "True",
      "evidenceQuote": "Exact short quote copied from the passage proving True/False, or exact area showing Not Given context"
    },
    {
      "id": 3,
      "type": "fill-blank",
      "question": "Complete the sentence: The main cause was _____.",
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

Include authentic IELTS question types:
- Multiple choice
- True/False/Not Given
- Matching headings or information
- Sentence completion / fill-in-the-blank
- Summary completion

For a full test, create exactly 40 questions spread across the three passages: 13 for Passage 1, 13 for Passage 2, and 14 for Passage 3.

Difficulty level: ${passageLabel}
Passage quality rules:
- Use clear IELTS formatting: PASSAGE 1 / PASSAGE 2 / PASSAGE 3, then a title, then paragraphs labelled A, B, C, D, etc.
- For a single passage, still label paragraphs A-G or A-H.
- Avoid generic textbook summaries; include specific dates, named studies, places, figures, and contrasting viewpoints.
- Do not make answers depend on outside knowledge.
Question quality rules:
- Group questions by passage for a full test and write question text with the target passage/paragraph when useful.
- Every question MUST include evidenceQuote: an exact 8-25 word quote copied character-for-character from the passage.
- The correct answer must be directly supported by evidenceQuote. If no exact quote exists, rewrite the question.
- Distractor options must be plausible but contradicted by, narrower than, broader than, or absent from the passage.
- Do not ask about ideas, people, dates, definitions, or examples that are not in the passage.
- Use matching questions with options and correctAnswer as a letter only.
- Multiple-choice correctAnswer must be A, B, C, or D. True/False/Not Given must use the full words.
- Fill-blank answers must be short exact words/phrases copied from the passage.
Make questions progressively harder. Ensure all answers are clearly derivable from the passage.`;

      const expectedQuestionCount = isFullTest ? 40 : 13;
      let lastParseError = "";

      for (let attempt = 1; attempt <= 2; attempt++) {
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
        const test: ReadingTest = JSON.parse(content);
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
        const userAns = (userAnswers[i] || "").toString().toLowerCase().trim();
        const correctAns = (correctAnswers[i] || "").toString().toLowerCase().trim();
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

      // Generate feedback
      const feedbackPrompt = `Based on an IELTS Reading test result:
- Score: ${correctCount}/${totalQuestions} (${percentage.toFixed(0)}%)
- Band Score: ${bandScore}

Provide 2-3 sentences of constructive feedback for improvement. Be encouraging but specific.`;

      const feedbackResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are an IELTS examiner providing brief, helpful feedback." },
            { role: "user", content: feedbackPrompt }
          ],
          temperature: 0.7,
        }),
      });

      let feedback = "Focus on understanding the main ideas and supporting details in the passage.";
      if (feedbackResponse.ok) {
        const feedbackData = await feedbackResponse.json();
        feedback = feedbackData.choices?.[0]?.message?.content || feedback;
      }

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

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
}

interface ReadingTest {
  topic: string;
  passage: string;
  questions: Question[];
}

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

      const difficultyLevel = difficulty || "passage-2";
      const wordCount = difficultyLevel === "passage-1" ? "300-400" : difficultyLevel === "passage-3" ? "600-800" : "450-550";
      const passageLabel = difficultyLevel === "passage-1" ? "IELTS Passage 1" : difficultyLevel === "passage-3" ? "IELTS Passage 3" : "IELTS Passage 2";

      const systemPrompt = `You are an IELTS Reading test generator. Create authentic IELTS-style reading passages with questions.

Generate a reading passage and 10 questions. The passage should be ${wordCount} words, academic in tone, and cover topics like science, history, social issues, or technology.

You MUST respond with ONLY valid JSON in this exact format:
{
  "topic": "Brief topic title",
  "passage": "The full passage text here...",
  "questions": [
    {
      "id": 1,
      "type": "multiple-choice",
      "question": "Question text",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correctAnswer": "A"
    },
    {
      "id": 2,
      "type": "true-false-not-given",
      "question": "Statement to evaluate",
      "options": ["True", "False", "Not Given"],
      "correctAnswer": "True"
    },
    {
      "id": 3,
      "type": "fill-blank",
      "question": "Complete the sentence: The main cause was _____.",
      "correctAnswer": "specific word or phrase"
    }
  ]
}

Include a mix of question types:
- 4 multiple-choice questions
- 3 true/false/not given questions
- 3 fill-in-the-blank questions

Difficulty level: ${passageLabel}
Make questions progressively harder. Ensure all answers are clearly derivable from the passage.`;

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
            { role: "user", content: `Generate a new ${passageLabel} reading test. Return only valid JSON.` }
          ],
          temperature: 0.7,
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
      
      try {
        const test: ReadingTest = JSON.parse(content);
        console.log("Generated test with", test.questions?.length, "questions");
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

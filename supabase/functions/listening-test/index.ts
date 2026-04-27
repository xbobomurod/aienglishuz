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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, userAnswers, correctAnswers, totalQuestions, section } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a new listening test
    if (action === "generate") {
      console.log("Generating listening test for section:", section);

      const sectionType = section || "full-test";
      const isFullTest = sectionType === "full-test";
      let scenarioDescription = "";
      let questionCount = isFullTest ? 40 : 10;

      switch (sectionType) {
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

${isFullTest ? "Full IELTS Listening test" : `Section ${sectionType}`} scenario: ${scenarioDescription}

Generate ${isFullTest ? "four labelled transcripts (SECTION 1-4) with realistic speaker labels and" : "a realistic dialogue/monologue transcript (250-350 words) and"} ${questionCount} questions.

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

Make the transcript natural, human, and emotionally believable while staying IELTS-appropriate: include hesitation, polite interruptions, mild surprise, clarification requests, enthusiasm, uncertainty, and natural discourse markers like "actually", "right", "let me check", and "that's helpful".
Use varied speaker turns instead of flat monologues when the section is conversational. Add punctuation that supports expressive listening: commas, dashes, ellipses, and question marks.
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
            { role: "user", content: `Generate a new IELTS Listening Section ${sectionType} test. Return only valid JSON.` }
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
      
      try {
        const test: ListeningTest = JSON.parse(content);
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
        const userAns = (userAnswers[i] || "").toString().toLowerCase().trim();
        const correctAns = (correctAnswers[i] || "").toString().toLowerCase().trim();
        
        // For fill-blank, allow some flexibility
        const isCorrect = userAns === correctAns || 
          correctAns.includes(userAns) || 
          userAns.includes(correctAns);
        
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

      // Generate feedback
      const feedbackPrompt = `Based on an IELTS Listening test result:
- Score: ${correctCount}/${totalQuestions} (${percentage.toFixed(0)}%)
- Band Score: ${bandScore}

Provide 2-3 sentences of constructive feedback for improving listening skills. Be encouraging but specific.`;

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

      let feedback = "Practice listening for specific details like names, numbers, and dates. Try shadowing exercises to improve comprehension.";
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
    console.error("Error in listening-test function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 2000;

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

const SYSTEM_PROMPT = (taskType: string, topic: string) => `You are Hannah, a warm, professional, certified IELTS Speaking Examiner conducting a LIVE face-to-face speaking exam over video call.

CRITICAL BEHAVIOR:
- Speak like a real human examiner: natural, conversational, brief. Use small acknowledgments ("I see.", "Right.", "Mm-hmm.", "Thank you.") before asking the next question — but DO NOT give feedback, scores, or corrections during the exam.
- Listen to what the candidate ACTUALLY said. Reference details from their answer when natural (e.g., "You mentioned you like painting — how often do you do that?").
- Ask ONE question at a time. Keep your reply to 1–3 short sentences max. Never lecture.
- Stay strictly in role as the examiner. Do not break character. Never mention you are an AI.
- Follow the official IELTS Speaking structure for the current part:
  • Part 1 (interview): short personal questions on familiar topics. Ask follow-ups naturally.
  • Part 2 (long turn): the candidate is speaking for 1-2 minutes. Only interject if they stop completely; otherwise say "Thank you" when they finish and ask one short rounding-off question.
  • Part 3 (discussion): abstract, analytical questions linked to the Part 2 topic. Probe with "Why do you think that?", "Could you give an example?", "How might that change in the future?"
- If the candidate is silent, stuck, or says "I don't know", gently rephrase or move on.
- If their answer is off-topic or unclear, ask a polite clarifying question.
- After 4–6 exchanges in the current part, you may say "Thank you. Let's move on to the next part." but only if asked to progress.
- NEVER output JSON. NEVER output markdown. Respond ONLY with what the examiner would say aloud — plain text, ready to be spoken by TTS. Keep punctuation natural for speech.

CURRENT PART: ${taskType}
CURRENT TOPIC / CUE: ${topic || "(not set — start with a friendly Part 1 opener)"}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;

    const { messages = [], taskType = "interview", topic = "" } = await req.json();

    if (!Array.isArray(messages) || messages.length > MAX_MESSAGES) {
      return new Response(JSON.stringify({ error: "Invalid conversation length" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    for (const m of messages) {
      if (!m || typeof m.content !== "string" || m.content.length > MAX_MESSAGE_CHARS) {
        return new Response(JSON.stringify({ error: "Invalid message" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (m.role !== "user" && m.role !== "assistant") {
        return new Response(JSON.stringify({ error: "Invalid role" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT(taskType, topic) },
          ...messages,
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error", response.status, t);
      return new Response(JSON.stringify({ error: "Failed to get examiner reply" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const reply = (data.choices?.[0]?.message?.content || "").trim();
    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("examiner-chat error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
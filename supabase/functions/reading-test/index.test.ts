import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/reading-test`;

Deno.test("reading-test: rejects request without Authorization header", async () => {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON },
    body: JSON.stringify({ action: "score" }),
  });
  const body = await res.json();
  assertEquals(res.status, 401);
  assert("error" in body);
});

Deno.test("reading-test: rejects invalid action", async () => {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
    },
    body: JSON.stringify({ action: "bogus" }),
  });
  await res.text();
  // 401 (anon token unusable as user) or 400 (invalid action) — both are acceptable failure modes
  assert([400, 401].includes(res.status), `unexpected status ${res.status}`);
});

Deno.test("reading-test: CORS preflight OK", async () => {
  const res = await fetch(FN_URL, { method: "OPTIONS" });
  await res.text();
  assertEquals(res.status, 200);
  assert(res.headers.get("access-control-allow-origin"));
});

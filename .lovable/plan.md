## Maqsad

1. AI generatsiya qilayotgan Reading / Listening / Writing / Speaking testlar va baholarni real Cambridge IELTS standartiga yaqinlashtirish — prompt'larni "10–20 ta haqiqiy test mantig'i" asosida qayta yozish.
2. Auth email'lardagi tasdiqlash linki `aienglishuz.vercel.app` ga olib borishi.
3. Coqui TTS (bepul) variantini aniqlash va listening uchun yaxshilash.

Boshqa katta bloklar (mobile UX, Learning page yangi featurelar, talking-head examiner) keyingi iteratsiyalarga qoldiriladi — bitta turda hammasini sifatli qilib bo'lmaydi.

---

## 1) Real IELTS uslubidagi promptlar (asosiy blok)

Har 4 edge function ichidagi system prompt'lar Cambridge IELTS 10–18 kitoblari + IELTS.org band descriptor'lari mantig'i asosida qayta yoziladi. Tashqi internetga real vaqt so'rov yo'q — namuna shablon, savol turlari, ohang va band qoidalari prompt'ga "knowledge base" sifatida singdiriladi.

### Reading — `supabase/functions/reading-test/index.ts`
Promptga quyidagilar qo'shiladi:
- Cambridge passage uzunligi (700–950 so'z), academic register, manba turi (journal, encyclopedia, magazine feature).
- 13 ta savolning REAL Cambridge taqsimoti, masalan: 4 ta heading-matching + 4 ta T/F/NG + 3 ta short-answer + 2 ta summary-completion (variant bo'yicha aralash).
- True/False/Not Given uchun aniq qoida (NG = passage'da yo'q, F = passage'ga zid) va to'g'ri javob formati `True` | `False` | `Not Given` (qisqartmasiz, holatga sezgir emas).
- Distraktor (chalg'ituvchi) yozish uslubi.
- Score → band 40→9.0, 35→8.0 ... aniq jadval.

### Listening — `supabase/functions/listening-test/index.ts`
- 4 ta section qoidasi: S1 ikki kishi suhbati (form filling), S2 monolog (map/labelling), S3 2–4 kishi akademik suhbati, S4 lecture (note completion).
- So'zlovchi rollari, regional aksent eslatmasi, qisqartmalar (e.g. "couldn't").
- 40 ta savol → 9.0 jadval.

### Writing — `supabase/functions/grade-essay/index.ts`
- Baholash 4 ta rasmiy descriptor bo'yicha: Task Achievement / Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy. Har biri 0–9, 0.5 step.
- Task 1 va Task 2 uchun alohida descriptor matni promptga kiritiladi (band 5/6/7/8 misollari bilan).
- Penalty qoidalari: 150/250 so'zdan kam = TA cap 5, memorised = cap 4, off-topic.
- Final band = (TA+CC+LR+GRA)/4, .25→.5, .75→keyingi butun.

### Speaking — `supabase/functions/analyze-speaking/index.ts`
- 4 ta descriptor: Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation.
- Part 1/2/3 uchun alohida baholash mantig'i (Part 2'da 1–2 min nutq talab qilinadi).
- Filler word, self-correction, hedging tahlili.

### Universal qoida
Hozir kodda allaqachon bor: "regex orqali JSON ajratish" — saqlanadi. Promptga `Return ONLY a JSON object with this exact shape: {...}` va few-shot misol qo'shiladi.

---

## 2) Speaking muhitini "real exam" ga yaqinlashtirish (engil bosqich)

Animatsiyali avatar (D-ID/HeyGen) bepul emas, shuning uchun bu turda quyidagilar qilinadi:
- ExaminerVoice komponentini turn-based dialog'ga aylantirish: AI savol beradi (TTS) → mikrofon avtomatik yoqiladi → foydalanuvchi javob → AI follow-up.
- Examiner sifatida statik AI-generated rasm (`src/assets/examiner.jpg`, imagegen orqali) + speaking paytida engil "talking" pulse animatsiyasi (CSS, ovoz amplitudasiga bog'liq).
- Part 1 → 2 → 3 ketma-ketligi avtomatik, real timing (Part 2 = 1 min prep + 1–2 min talk).

Bu "tekin va real suhbatchi kabi" talabga eng yaqin variant. Keyinroq xohlasangiz haqiqiy talking-head qo'shamiz.

---

## 3) Coqui TTS / Listening ovozi

**Muhim eslatma:** Coqui TTS — bu Python self-hosted kutubxona. Lovable edge function'lari Deno'da ishlaydi va Python yoki og'ir ML model'larni hosting qila olmaydi. Coqui'ni ishlatish uchun alohida server (Render, Fly.io, HuggingFace Space) deploy qilish kerak.

Shuning uchun ushbu reja:
- Hozircha **Web Speech API + sifatli prompt** yondashuvini saqlaymiz (chunki haqiqatdan ham tekin va tez).
- Listening uchun multi-speaker effekt: har bir speaker uchun browser ovoz pool'idan boshqa voice tanlaymiz (S3'da 3 kishi = 3 har xil ovoz), tempo va pitch farqlanadi → "haqiqiy suhbat" hissi kuchayadi.
- Agar keyinchalik **siz Coqui server'ni deploy qilsangiz** (men URL'ni qabul qiladigan edge function yozaman), bemalol o'tkazamiz. Bu alohida iteratsiya bo'ladi.

Alternativa (xohlasangiz keyin qo'shaman): HuggingFace Inference API orqali bepul `coqui/XTTS-v2` chaqirish — bunga `HUGGINGFACE_API_KEY` (bepul) kerak bo'ladi.

---

## 4) Auth email link → `aienglishuz.vercel.app`

Hozir lovable orqali kelishining sababi: Supabase Site URL preview domenga sozlangan va kodda `emailRedirectTo: ${window.location.origin}` ishlatilgan (preview'dan signup qilsangiz preview URL ketadi).

Qadamlar:

**A. Supabase URL Configuration (Cloud UI orqali bir martalik sozlash — men ko'rsataman):**
- Site URL: `https://aienglishuz.vercel.app`
- Redirect URLs: `https://aienglishuz.vercel.app/**`, `https://aienglishuz.lovable.app/**` (publish), preview URL'lar.

**B. Kodda redirect'larni qattiq belgilash (src/hooks/useAuth.ts, src/pages/Auth.tsx, src/pages/ResetPassword.tsx):**
```ts
const PROD_URL = "https://aienglishuz.vercel.app";
const redirectBase =
  window.location.hostname === "localhost" ? window.location.origin : PROD_URL;

supabase.auth.signUp({
  email, password,
  options: { emailRedirectTo: `${redirectBase}/` }
});
supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${redirectBase}/reset-password`
});
```
Bu real foydalanuvchilarga doimo `aienglishuz.vercel.app` link yuboradi.

---

## Texnik qisqacha (texnik foydalanuvchi uchun)

- O'zgaradigan fayllar:
  - `supabase/functions/reading-test/index.ts` — system prompt, T/F/NG normalize.
  - `supabase/functions/listening-test/index.ts` — section qoidalari, multi-speaker hint.
  - `supabase/functions/grade-essay/index.ts` — 4 descriptor + Task 1/2 rubric.
  - `supabase/functions/analyze-speaking/index.ts` — 4 descriptor + Part 1/2/3 baholash.
  - `src/components/ExaminerVoice.tsx` + `src/components/SpeakingModule.tsx` — turn-based dialog, examiner foto + speaking pulse.
  - `src/assets/examiner.jpg` — imagegen.
  - `src/hooks/useAuth.ts`, `src/pages/Auth.tsx`, `src/pages/ResetPassword.tsx` — PROD_URL redirect.
  - `src/components/ListeningModule.tsx` + `src/components/mock-test/MockListeningSection.tsx` — multi-voice TTS.
- DB o'zgarishi yo'q.
- Yangi secret yo'q (Coqui keyingi iteratsiyaga).

---

## Shu turda QILINMAYDIGAN (alohida iteratsiyaga)

- Mobile UX umumiy refactor — alohida katta blok.
- Learning page'ga yangi featurelar — alohida.
- Animatsiyali talking-head examiner (D-ID/HeyGen) — pulli.
- Coqui server deploy qilish — sizdan server URL kerak.

Tasdiqlasangiz, build mode'da boshlayman.
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Headphones,
  PenTool,
  Mic,
  Trophy,
  Sparkles,
  Timer,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import heroStudent from "@/assets/hero-student.jpg";

const skills = [
  { icon: BookOpen, title: "Reading", spec: "3 passages • 40 questions • 60 min", desc: "Cambridge-style passages with highlight mode, flags and instant answer keys." },
  { icon: Headphones, title: "Listening", spec: "4 sections • 40 questions • 30 min", desc: "Exam-accurate single-play audio with real transcript review." },
  { icon: PenTool, title: "Writing", spec: "Task 1 + Task 2 • 60 min", desc: "Band scores per criterion, corrections table and a model answer." },
  { icon: Mic, title: "Speaking", spec: "Parts 1–3 • 11–14 min", desc: "A Zoom-style room where an AI examiner asks and reacts live." },
];

const steps = [
  { n: "01", title: "Pick your skill", text: "Start a single skill drill or the full 2h 45m mock test." },
  { n: "02", title: "Sit the exam", text: "Real timers, real formats, focus mode and scratch notes." },
  { n: "03", title: "Get your band", text: "Criterion-by-criterion scoring with clear fixes for next time." },
];

const forStudents = [
  "Free to start — no card, no tutor booking",
  "Feedback in seconds, not next week",
  "Study on a phone between classes",
  "Streaks and daily goals keep you consistent",
  "Saved vocabulary from every passage",
  "Progress charts that show your band trend",
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/70 bg-card/85 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl gradient-accent flex items-center justify-center shadow-card">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">AI ENGLISH UZ</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#skills" className="hover:text-foreground transition-colors">Modules</a>
            <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#students" className="hover:text-foreground transition-colors">For students</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>Sign in</Button>
            <Button size="sm" onClick={() => navigate("/auth?mode=signup")}>Start free</Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 gradient-hero opacity-70" aria-hidden="true" />
          <div className="container relative px-4 py-14 sm:py-20 lg:py-24 grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-border rounded-full bg-card shadow-soft mb-6">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span className="text-[11px] sm:text-xs font-bold tracking-[0.16em] uppercase text-primary">
                  Built for IELTS students
                </span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.05] text-foreground text-balance mb-5">
                Get your IELTS band
                <br />
                <span className="text-primary">before exam day.</span>
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-[52ch] mb-8">
                Full computer-delivered mock tests for Reading, Listening, Writing and
                Speaking — scored in seconds by an AI examiner trained on official band
                descriptors.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-10">
                <Button size="lg" className="px-8 py-6 font-bold" onClick={() => navigate("/auth?mode=signup")}>
                  Start free practice
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button size="lg" variant="outline" className="px-8 py-6 font-bold" onClick={() => navigate("/auth")}>
                  I already have an account
                </Button>
              </div>

              <dl className="grid grid-cols-3 gap-4 sm:gap-8 pt-6 border-t border-border">
                {[
                  ["4 / 4", "Skills covered"],
                  ["2h 45m", "Full mock test"],
                  ["Band 0–9", "Official rubric"],
                ].map(([v, l]) => (
                  <div key={l} className="flex flex-col gap-1">
                    <dt className="font-display text-xl sm:text-2xl text-primary">{v}</dt>
                    <dd className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide">{l}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative">
              <img
                src={heroStudent}
                alt="Student practising IELTS on a laptop with headphones"
                width={1280}
                height={1280}
                className="w-full rounded-3xl border border-border shadow-elevated object-cover aspect-[4/3]"
              />
              <div className="absolute -bottom-5 left-4 right-4 sm:left-8 sm:right-8 bg-card border border-border rounded-2xl shadow-elevated p-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Estimated band 7.0</p>
                  <p className="text-xs text-muted-foreground truncate">
                    Task response 7.5 · Coherence 7.0 · Lexical 6.5 · Grammar 7.0
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Skills */}
        <section id="skills" className="container px-4 py-16 sm:py-24 mt-6">
          <div className="max-w-2xl mb-10">
            <h2 className="font-display text-3xl sm:text-4xl text-foreground mb-3">
              Every part of the exam, in one workspace
            </h2>
            <p className="text-muted-foreground">
              Each module mirrors the real computer-delivered test — same timing, same
              question types, same pressure.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {skills.map((s) => (
              <article
                key={s.title}
                className="p-6 rounded-2xl bg-card border border-border shadow-card hover:shadow-elevated hover:-translate-y-1 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <s.icon className="w-6 h-6" />
                </div>
                <h3 className="font-display text-xl text-foreground mb-1">{s.title}</h3>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">{s.spec}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </article>
            ))}
          </div>

          <div className="mt-6 rounded-2xl bg-primary text-primary-foreground p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-elevated">
            <div className="flex items-start gap-4">
              <span className="w-11 h-11 rounded-xl bg-primary-foreground/10 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-display text-xl">Full IELTS mock test</h3>
                <p className="text-sm text-primary-foreground/75">
                  All four modules back-to-back with an overall estimated band score.
                </p>
              </div>
            </div>
            <Button variant="secondary" size="lg" onClick={() => navigate("/auth?mode=signup")}>
              Try a mock test
            </Button>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-y border-border bg-secondary/40">
          <div className="container px-4 py-16 sm:py-24">
            <h2 className="font-display text-3xl sm:text-4xl text-foreground mb-10">How it works</h2>
            <ol className="grid md:grid-cols-3 gap-6">
              {steps.map((s) => (
                <li key={s.n} className="bg-card border border-border rounded-2xl p-6 shadow-soft">
                  <span className="font-display text-3xl text-primary/40">{s.n}</span>
                  <h3 className="font-display text-xl text-foreground mt-3 mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* For students */}
        <section id="students" className="container px-4 py-16 sm:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-accent mb-4">
              <GraduationCap className="w-4 h-4" />
              Student friendly
            </div>
            <h2 className="font-display text-3xl sm:text-4xl text-foreground mb-4">
              Made for the student budget and the student timetable
            </h2>
            <p className="text-muted-foreground mb-8 max-w-[52ch]">
              No tutor waiting lists, no expensive centres. Practise between lectures,
              on the bus, or the night before your test.
            </p>
            <ul className="grid sm:grid-cols-2 gap-3">
              {forStudents.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-elevated">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary mb-6">
              <Timer className="w-4 h-4" /> A typical study week
            </div>
            <div className="space-y-4">
              {[
                ["Mon", "Reading drill", "20 min"],
                ["Wed", "Writing Task 2 + AI feedback", "40 min"],
                ["Fri", "Speaking room with examiner", "15 min"],
                ["Sun", "Full mock test", "2h 45m"],
              ].map(([day, task, len]) => (
                <div key={day} className="flex items-center gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
                  <span className="w-12 text-xs font-bold uppercase tracking-wide text-muted-foreground">{day}</span>
                  <span className="flex-1 text-sm font-medium text-foreground">{task}</span>
                  <span className="text-xs text-muted-foreground">{len}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container px-4 pb-20">
          <div className="rounded-3xl border border-border gradient-hero p-8 sm:p-14 text-center shadow-elevated">
            <h2 className="font-display text-3xl sm:text-4xl text-foreground mb-4">
              Your first mock test is free
            </h2>
            <p className="text-muted-foreground max-w-[46ch] mx-auto mb-8">
              Create an account and find out your current band in under three hours.
            </p>
            <Button size="lg" className="px-10 py-6 font-bold" onClick={() => navigate("/auth?mode=signup")}>
              Create free account
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card/60 py-8">
        <div className="container px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} IELTS Coach — AI-powered IELTS practice.</p>
          <Link to="/auth" className="hover:text-foreground transition-colors">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}

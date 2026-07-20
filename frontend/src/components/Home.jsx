import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Search,
  FileSearch,
  MessageSquareText,
  ScaleIcon,
  ShieldCheck,
  FileCheck2,
  Receipt,
  ArrowRight,
  X,
  Check,
  Fingerprint,
  Bot,
  UserCheck,
  ClipboardCheck,
  MessageCircleQuestion,
  Quote,
  Lock,
  Sparkles,
} from "lucide-react";

/* ============================================================
   DESIGN TOKENS
   bg        #0A0A0B  (case-file black)
   surface   #131315
   line      #232326
   ink       #EDEDEE
   mute      #8C8C92
   evidence  #D7FF3F  (highlighter lime — tags human-owned evidence)
   verified  #59E8A6  (verification green)
   flag      #FF6A57  (rejection / AI-not-proof red-orange)
   Display   'Space Grotesk'  — case-file headers
   Body      'Inter'
   Mono      'JetBrains Mono' — timeline / evidence snippets
   ============================================================ */

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
`;

const flowSteps = [
  { label: "Mission", icon: Fingerprint },
  { label: "Investigation", icon: Search },
  { label: "Evidence Collection", icon: FileSearch },
  { label: "AI Interaction", icon: Bot },
  { label: "Human Decision", icon: UserCheck },
  { label: "Verification", icon: ShieldCheck },
  { label: "Independent Explanation", icon: MessageSquareText },
  { label: "Competency Receipt", icon: Receipt },
];

const marqueeSequence = [
  "Investigate",
  "Collect Evidence",
  "Question AI",
  "Make a Judgment",
  "Verify",
  "Explain",
];

const unanswered = [
  "Did the person understand the problem?",
  "Did they investigate before asking AI?",
  "Did they blindly accept the AI suggestion?",
  "Did they verify the AI's recommendation?",
  "Could they identify when AI was wrong?",
  "Did they make an independent judgment?",
  "Can they explain why they chose their final solution?",
];

const evidenceCards = [
  {
    tag: "Problem Framing",
    icon: MessageCircleQuestion,
    snippet:
      "I want to investigate whether the checkout failure is related to the payment validation flow.",
  },
  {
    tag: "Evidence Selection",
    icon: FileSearch,
    snippet:
      "Checkout.js appears relevant because the failure occurs during the payment submission flow.",
  },
  {
    tag: "AI Interaction",
    icon: Bot,
    snippet: "AI suggests a possible cause.",
    note: "AI output is context, not automatic proof of human competency.",
  },
  {
    tag: "Human Decision",
    icon: ScaleIcon,
    snippet: "Accept suggestion · Reject suggestion · Choose an alternative",
  },
  {
    tag: "Verification",
    icon: ShieldCheck,
    snippet:
      "The proposed fix explains the failure, but I need to verify whether it also affects the retry path.",
  },
  {
    tag: "Independent Explanation",
    icon: MessageSquareText,
    snippet:
      "The issue is caused by X because the evidence shows Y. I rejected the alternative because Z.",
  },
  {
    tag: "Final Solution",
    icon: FileCheck2,
    snippet: "The learner submits a final solution.",
  },
];

const competencies = [
  {
    n: "Technical Execution",
    q: "Can the learner produce a technically sound solution?",
    evidence: [
      "Final solution",
      "Implementation decisions",
      "Technical reasoning",
      "Verification of the solution",
    ],
    icon: FileCheck2,
  },
  {
    n: "Problem Framing",
    q: "Can the learner understand and investigate the real problem?",
    evidence: [
      "Investigation questions",
      "Initial reasoning",
      "Deliberate evidence selection",
    ],
    icon: Search,
  },
  {
    n: "AI Verification",
    q: "Can the learner critically evaluate AI output instead of blindly trusting it?",
    evidence: [
      "Decisions regarding AI suggestions",
      "Verification actions",
      "Testing AI-provided information",
    ],
    icon: ShieldCheck,
  },
  {
    n: "Independent Judgment",
    q: "Can the learner make their own decisions?",
    evidence: ["A learner decision", "An independent explanation of that decision"],
    icon: UserCheck,
    note: "The AI can suggest. The learner must decide.",
  },
  {
    n: "Communication",
    q: "Can the learner clearly explain their final reasoning and solution?",
    evidence: ["Final solution", "Independent explanation", "Clear reasoning"],
    icon: MessageSquareText,
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

function Marquee({ items, reverse, className = "" }) {
  const seq = [...items, ...items, ...items, ...items];
  return (
    <div className={`overflow-hidden whitespace-nowrap ${className}`}>
      <motion.div
        className="inline-flex items-center gap-8"
        animate={{ x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
      >
        {seq.map((t, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-3 text-lg md:text-2xl font-medium"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <span className="text-[#EDEDEE]/90">{t}</span>
            <ArrowRight size={18} className="text-[#D7FF3F]" />
          </span>
        ))}
      </motion.div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="h-px w-8 bg-[#D7FF3F]" />
      <span
        className="uppercase tracking-[0.25em] text-xs text-[#8C8C92]"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {children}
      </span>
    </div>
  );
}

export default function WorkTraceLanding() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div
      className="min-h-screen w-full bg-[#0A0A0B] text-[#EDEDEE] selection:bg-[#D7FF3F] selection:text-black overflow-x-hidden"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <style>{FONT_IMPORT}</style>

      {/* faint grid backdrop */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(#EDEDEE 1px, transparent 1px), linear-gradient(90deg, #EDEDEE 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      {/* NAVBAR */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-[#0A0A0B]/70 border-b border-[#232326]">
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-[#D7FF3F] flex items-center justify-center">
              <Fingerprint size={18} className="text-black" />
            </div>
            <span
              className="text-lg tracking-tight font-semibold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              WorkTrace
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-[#8C8C92]">
            <a href="#flow" className="hover:text-[#EDEDEE] transition-colors">
              Flow
            </a>
            <a href="#evidence" className="hover:text-[#EDEDEE] transition-colors">
              Evidence
            </a>
            <a href="#competencies" className="hover:text-[#EDEDEE] transition-colors">
              Competencies
            </a>
            <a href="#receipt" className="hover:text-[#EDEDEE] transition-colors">
              Receipt
            </a>
          </nav>
          <button className="text-sm font-medium px-4 py-2 rounded-md bg-[#EDEDEE] text-black hover:bg-[#D7FF3F] transition-colors">
            Request Access
          </button>
        </div>
      </header>

      {/* HERO */}
      <section
        ref={heroRef}
        className="relative pt-40 pb-28 px-6 md:px-10 max-w-7xl mx-auto"
      >
        <motion.div style={{ y: heroY, opacity: heroOpacity }}>
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="flex items-center gap-3 mb-8"
          >
            <span className="px-3 py-1 rounded-full border border-[#232326] text-xs text-[#8C8C92] tracking-wide">
              Proof of Work for AI-Native Competency
            </span>
          </motion.div>

          <motion.h1
            custom={1}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="text-4xl sm:text-5xl md:text-7xl leading-[1.05] font-semibold tracking-tight max-w-5xl"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            AI can generate the answer.
            <br />
            <span className="text-[#8C8C92]">WorkTrace shows how</span>{" "}
            <span className="text-[#D7FF3F]">you arrived at yours.</span>
          </motion.h1>

          <motion.p
            custom={2}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="mt-8 text-base md:text-lg text-[#8C8C92] max-w-2xl"
          >
            WorkTrace is an AI-native competency assessment platform. Instead of
            only evaluating a person's final answer, it evaluates how they
            worked with AI to reach that answer — inside a realistic
            investigation environment.
          </motion.p>

          <motion.div
            custom={3}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <button className="group flex items-center gap-2 px-6 py-3 rounded-md bg-[#D7FF3F] text-black font-medium hover:bg-white transition-colors">
              See an Investigation
              <ArrowRight
                size={16}
                className="group-hover:translate-x-1 transition-transform"
              />
            </button>
            <button className="px-6 py-3 rounded-md border border-[#232326] text-[#EDEDEE] hover:border-[#8C8C92] transition-colors">
              How Scoring Works
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* MARQUEE BAND */}
      <div className="border-y border-[#232326] bg-[#0F0F10] py-6">
        <Marquee items={marqueeSequence} />
      </div>

      {/* THE PROBLEM */}
      <section className="px-6 md:px-10 max-w-7xl mx-auto py-28 md:py-36">
        <SectionLabel>The Problem</SectionLabel>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-5xl font-semibold tracking-tight max-w-3xl"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          The final answer doesn't reveal the work behind it.
        </motion.h2>

        <div className="mt-14 grid md:grid-cols-2 gap-10 items-start">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-xl border border-[#232326] bg-[#131315] p-8"
          >
            <div className="flex items-center gap-2 text-[#8C8C92] text-sm mb-6">
              <X size={16} className="text-[#FF6A57]" />
              Traditional assessment
            </div>
            <div
              className="flex items-center gap-3 text-lg md:text-xl flex-wrap"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              <span className="px-4 py-2 rounded-md bg-[#0A0A0B] border border-[#232326]">
                Question
              </span>
              <ArrowRight size={18} className="text-[#8C8C92]" />
              <span className="px-4 py-2 rounded-md bg-[#0A0A0B] border border-[#232326]">
                Answer
              </span>
              <ArrowRight size={18} className="text-[#8C8C92]" />
              <span className="px-4 py-2 rounded-md bg-[#0A0A0B] border border-[#232326]">
                Score
              </span>
            </div>
            <p className="mt-6 text-sm text-[#8C8C92]">
              This is becoming less meaningful in an AI-assisted world — the
              final answer alone doesn't reveal the process behind it.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-xl border border-[#232326] bg-[#131315] p-8"
          >
            <div className="flex items-center gap-2 text-[#8C8C92] text-sm mb-6">
              <MessageCircleQuestion size={16} className="text-[#D7FF3F]" />
              What actually matters
            </div>
            <ul className="space-y-3">
              {unanswered.map((q, i) => (
                <motion.li
                  key={q}
                  custom={i}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="flex items-start gap-3 text-sm md:text-base text-[#EDEDEE]/90"
                >
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#D7FF3F] shrink-0" />
                  {q}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* INVESTIGATION FLOW */}
      <section id="flow" className="px-6 md:px-10 max-w-7xl mx-auto py-28 md:py-36">
        <SectionLabel>The WorkTrace Investigation Flow</SectionLabel>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-5xl font-semibold tracking-tight max-w-3xl mb-16"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Every investigation leaves a timeline.
        </motion.h2>

        <div className="relative">
          <div className="hidden md:block absolute left-6 top-6 bottom-6 w-px bg-gradient-to-b from-[#D7FF3F] via-[#232326] to-transparent" />
          <div className="space-y-4 md:space-y-0">
            {flowSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.label}
                  custom={i}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="relative flex items-center gap-6 md:py-5 group"
                >
                  <div className="relative z-10 shrink-0 w-12 h-12 rounded-full border border-[#232326] bg-[#131315] flex items-center justify-center group-hover:border-[#D7FF3F] group-hover:bg-[#D7FF3F]/10 transition-colors">
                    <Icon size={18} className="text-[#D7FF3F]" />
                  </div>
                  <div className="flex-1 flex items-center justify-between border-b border-[#1c1c1e] pb-5 md:pb-4">
                    <span
                      className="text-lg md:text-2xl"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {step.label}
                    </span>
                    <span
                      className="text-xs text-[#8C8C92] hidden sm:block"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PHILOSOPHY */}
      <section className="px-6 md:px-10 py-28 md:py-36 border-y border-[#232326] bg-[#0F0F10]">
        <div className="max-w-7xl mx-auto">
          <SectionLabel>Core Philosophy</SectionLabel>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-6xl font-semibold tracking-tight max-w-4xl"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            AI is not the candidate.{" "}
            <span className="text-[#D7FF3F]">The AI is a teammate.</span>
          </motion.h2>

          <div className="mt-16 grid md:grid-cols-2 gap-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-[#8C8C92] mb-6 max-w-md">
                The human remains responsible for every judgment call in the
                investigation:
              </p>
              <ul className="space-y-3">
                {[
                  "Asking meaningful questions",
                  "Selecting useful evidence",
                  "Evaluating AI suggestions",
                  "Accepting or rejecting recommendations",
                  "Making decisions",
                  "Verifying outcomes",
                  "Explaining reasoning",
                ].map((item, i) => (
                  <motion.li
                    key={item}
                    custom={i}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true }}
                    variants={fadeUp}
                    className="flex items-center gap-3 text-[#EDEDEE]/90"
                  >
                    <Check size={16} className="text-[#59E8A6] shrink-0" />
                    {item}
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="rounded-xl border border-[#232326] bg-[#131315] p-8 flex flex-col justify-between"
            >
              <div>
                <Quote size={22} className="text-[#D7FF3F] mb-4" />
                <p
                  className="text-lg md:text-xl leading-relaxed"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  WorkTrace records these actions as an evidence timeline. The
                  system does not give the learner credit simply because AI
                  produced something useful.
                </p>
              </div>
              <div className="mt-8 text-xs text-[#8C8C92] flex items-center gap-2">
                <Lock size={14} />
                Evidence timeline — immutable after generation
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* WHAT WORKTRACE CAPTURES */}
      <section id="evidence" className="px-6 md:px-10 max-w-7xl mx-auto py-28 md:py-36">
        <SectionLabel>What WorkTrace Captures</SectionLabel>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-5xl font-semibold tracking-tight max-w-3xl mb-16"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          A structured timeline of the investigation.
        </motion.h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {evidenceCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.tag}
                custom={i}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="rounded-xl border border-[#232326] bg-[#131315] p-6 hover:border-[#D7FF3F]/60 transition-colors"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="w-9 h-9 rounded-md bg-[#D7FF3F]/10 flex items-center justify-center">
                    <Icon size={16} className="text-[#D7FF3F]" />
                  </div>
                  <span
                    className="text-[10px] uppercase tracking-wider text-[#8C8C92]"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Evidence {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3
                  className="text-base font-medium mb-3"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {card.tag}
                </h3>
                <p
                  className="text-sm text-[#8C8C92] leading-relaxed"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  "{card.snippet}"
                </p>
                {card.note && (
                  <p className="mt-4 text-xs text-[#FF6A57] flex items-start gap-2">
                    <X size={13} className="shrink-0 mt-0.5" />
                    {card.note}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* FIVE COMPETENCIES */}
      <section
        id="competencies"
        className="px-6 md:px-10 py-28 md:py-36 border-y border-[#232326] bg-[#0F0F10]"
      >
        <div className="max-w-7xl mx-auto">
          <SectionLabel>The Five Competencies</SectionLabel>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-5xl font-semibold tracking-tight max-w-3xl mb-16"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Five dimensions, each grounded in evidence.
          </motion.h2>

          <div className="space-y-0">
            {competencies.map((c, i) => {
              const Icon = c.icon;
              return (
                <motion.div
                  key={c.n}
                  custom={i}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="grid md:grid-cols-12 gap-6 py-10 border-b border-[#1c1c1e] items-start"
                >
                  <div className="md:col-span-1 flex md:block items-center gap-3">
                    <span
                      className="text-xs text-[#8C8C92]"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="md:col-span-4 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-md bg-[#D7FF3F]/10 flex items-center justify-center shrink-0">
                      <Icon size={18} className="text-[#D7FF3F]" />
                    </div>
                    <div>
                      <h3
                        className="text-xl md:text-2xl"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {c.n}
                      </h3>
                      <p className="text-sm text-[#8C8C92] mt-1">{c.q}</p>
                    </div>
                  </div>
                  <div className="md:col-span-7">
                    <div className="flex flex-wrap gap-2">
                      {c.evidence.map((e) => (
                        <span
                          key={e}
                          className="px-3 py-1.5 rounded-full border border-[#232326] text-xs text-[#EDEDEE]/80"
                        >
                          {e}
                        </span>
                      ))}
                    </div>
                    {c.note && (
                      <p className="mt-4 text-sm text-[#D7FF3F] font-medium">
                        {c.note}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* COMPETENCY RECEIPT */}
      <section id="receipt" className="px-6 md:px-10 max-w-7xl mx-auto py-28 md:py-40">
        <SectionLabel>Competency Receipt</SectionLabel>
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2
              className="text-3xl md:text-5xl font-semibold tracking-tight mb-6"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Not a score. A receipt.
            </h2>
            <p className="text-[#8C8C92] max-w-md mb-8">
              The receipt connects competency evaluation to actual evidence
              from the investigation — competency, down to the score, down to
              the evidence, down to the exact timeline event and learner
              action behind it.
            </p>
            <div className="flex flex-wrap gap-3">
              {["Evidence-grounded", "Traceable", "Sanitized", "Immutable"].map(
                (tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#232326] text-xs text-[#EDEDEE]/80"
                  >
                    <Sparkles size={12} className="text-[#D7FF3F]" />
                    {tag}
                  </span>
                )
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="rounded-xl border border-[#232326] bg-[#131315] p-8 shadow-[0_0_60px_-15px_rgba(215,255,63,0.15)]">
              <div className="flex items-center justify-between mb-6 pb-6 border-b border-dashed border-[#2c2c2f]">
                <div className="flex items-center gap-2">
                  <Receipt size={18} className="text-[#D7FF3F]" />
                  <span
                    className="text-sm"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    COMPETENCY_RECEIPT
                  </span>
                </div>
                <ClipboardCheck size={16} className="text-[#59E8A6]" />
              </div>

              <div
                className="space-y-4 text-sm"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[#8C8C92]">Competency</span>
                  <span className="text-[#EDEDEE]">AI Verification</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8C8C92]">Evidence</span>
                  <span className="text-right text-[#EDEDEE] max-w-[60%]">
                    Rejected AI suggestion, verified alternative
                  </span>
                </div>
                <div className="pt-4 border-t border-[#232326]">
                  <span className="text-[#8C8C92] block mb-2">
                    Why it matters
                  </span>
                  <p className="text-[#EDEDEE]/90 leading-relaxed">
                    The learner demonstrated critical evaluation rather than
                    blindly accepting AI output.
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-dashed border-[#2c2c2f] flex items-center justify-between">
                <span
                  className="text-[10px] text-[#8C8C92] uppercase tracking-wider"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Associated with completed investigation
                </span>
                <Lock size={13} className="text-[#8C8C92]" />
              </div>
            </div>
            <div className="absolute -inset-x-6 -bottom-3 h-6 bg-[#0A0A0B] border-x border-b border-[#232326] rounded-b-xl -z-10" />
          </motion.div>
        </div>
      </section>

      {/* CLOSING MARQUEE */}
      <div className="border-y border-[#232326] bg-[#0F0F10] py-6">
        <Marquee items={marqueeSequence} reverse />
      </div>

      {/* FOOTER */}
      <footer className="px-6 md:px-10 max-w-7xl mx-auto py-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#D7FF3F] flex items-center justify-center">
            <Fingerprint size={15} className="text-black" />
          </div>
          <span
            className="font-semibold"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            WorkTrace
          </span>
        </div>
        <p className="text-sm text-[#8C8C92] max-w-md">
          Proof of Work for AI-Native Competency.
        </p>
        <div className="flex gap-6 text-sm text-[#8C8C92]">
          <a href="#flow" className="hover:text-[#EDEDEE] transition-colors">
            Flow
          </a>
          <a href="#evidence" className="hover:text-[#EDEDEE] transition-colors">
            Evidence
          </a>
          <a href="#competencies" className="hover:text-[#EDEDEE] transition-colors">
            Competencies
          </a>
        </div>
      </footer>
    </div>
  );
}
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Fingerprint,
  Receipt,
  ShieldCheck,
  Lock,
  Check,
  ArrowRight,
  ArrowLeft,
  FileCheck2,
  Search,
  Bot,
  UserCheck,
  MessageSquareText,
  ScaleIcon,
  ChevronDown,
  Sparkles,
  Download,
  Share2,
  Clock,
  Hash,
  CircleCheck,
  X,
  Quote,
} from "lucide-react";

/* ============================================================
   Shared design tokens — matches WorkTraceLanding.jsx
   bg #0A0A0B  surface #131315  line #232326  ink #EDEDEE
   mute #8C8C92  evidence(lime) #D7FF3F  verified #59E8A6  flag #FF6A57
   Display 'Space Grotesk'  Body 'Inter'  Mono 'JetBrains Mono'
   ============================================================ */

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
`;

/* ---------------- mock receipt data (shape only — no invented backend behavior) ---------------- */

const mission = {
  org: "NovaCommerce",
  role: "Junior Product Engineer",
  problem: "Checkout conversion has dropped by 12%.",
  files: ["frontend/Checkout.js", "frontend/Cart.js", "backend/checkout.js"],
};

const receiptMeta = {
  id: "wt_rcpt_8f21c9",
  status: "Completed",
  generatedAt: "Investigation session — completed",
};

const competencies = [
  {
    key: "technical-execution",
    n: "Technical Execution",
    q: "Can the learner produce a technically sound solution?",
    icon: FileCheck2,
    score: 88,
    band: "Strong",
    reasoning:
      "The learner's final solution correctly addressed the root cause identified during investigation and was implemented with sound technical judgment.",
    evidence: [
      {
        type: "final_solution",
        owner: "learner",
        label: "Final solution",
        detail:
          "Submitted a fix targeting the payment validation flow in Checkout.js.",
      },
    ],
  },
  {
    key: "problem-framing",
    n: "Problem Framing",
    q: "Can the learner understand and investigate the real problem?",
    icon: Search,
    score: 82,
    band: "Strong",
    reasoning:
      "The learner framed a clear investigation question before requesting AI input and deliberately selected relevant evidence to narrow the problem space.",
    evidence: [
      {
        type: "investigation_question_or_reasoning",
        owner: "learner",
        label: "Investigation reasoning",
        detail:
          "I want to investigate whether the checkout failure is related to the payment validation flow.",
      },
      {
        type: "learner_selected_evidence",
        owner: "learner",
        label: "Selected evidence",
        detail:
          "Checkout.js appears relevant because the failure occurs during the payment submission flow.",
      },
    ],
  },
  {
    key: "ai-verification",
    n: "AI Verification",
    q: "Can the learner critically evaluate AI output instead of blindly trusting it?",
    icon: ShieldCheck,
    score: 91,
    band: "Excellent",
    reasoning:
      "The learner did not accept the AI suggestion at face value — they tested it against the retry path before treating it as valid.",
    evidence: [
      {
        type: "decision",
        owner: "learner",
        label: "Decision on AI suggestion",
        detail: "Rejected the initial AI suggestion as incomplete.",
      },
      {
        type: "verification",
        owner: "learner",
        label: "Verification action",
        detail:
          "The proposed fix explains the failure, but I need to verify whether it also affects the retry path.",
      },
    ],
    aiContext: {
      type: "suggestion",
      owner: "ai",
      label: "AI suggestion (context only)",
      detail: "AI suggested a possible cause in the payment validation step.",
    },
  },
  {
    key: "independent-judgment",
    n: "Independent Judgment",
    q: "Can the learner make their own decisions?",
    icon: UserCheck,
    score: 85,
    band: "Strong",
    reasoning:
      "The learner made an explicit decision on the AI's suggestion and independently explained why the accepted path was correct.",
    evidence: [
      {
        type: "decision",
        owner: "learner",
        label: "Learner decision",
        detail: "Chose an alternative fix over the AI's original suggestion.",
      },
      {
        type: "independent_explanation",
        owner: "learner",
        label: "Independent explanation",
        detail:
          "The issue is caused by X because the evidence shows Y. I rejected the alternative because Z.",
      },
    ],
    note: "The AI can suggest. The learner must decide.",
  },
  {
    key: "communication",
    n: "Communication",
    q: "Can the learner clearly explain their final reasoning and solution?",
    icon: MessageSquareText,
    score: 79,
    band: "Solid",
    reasoning:
      "The learner's explanation was clear and directly tied to the evidence gathered, though it could have addressed the retry path in more depth.",
    evidence: [
      {
        type: "final_solution",
        owner: "learner",
        label: "Final solution",
        detail: "Submitted final solution to the checkout team.",
      },
      {
        type: "independent_explanation",
        owner: "learner",
        label: "Independent explanation",
        detail: "Clear reasoning tied final solution back to root cause.",
      },
    ],
  },
];

const overallScore = Math.round(
  competencies.reduce((a, c) => a + c.score, 0) / competencies.length
);

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

function bandColor(band) {
  if (band === "Excellent") return "#D7FF3F";
  if (band === "Strong") return "#59E8A6";
  return "#EDEDEE";
}

function ScoreRing({ value, size = 120, stroke = 8, color = "#D7FF3F" }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#232326"
          strokeWidth={stroke}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          whileInView={{ strokeDashoffset: c - (value / 100) * c }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-2xl font-semibold"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {value}
        </span>
        <span className="text-[10px] text-[#8C8C92] uppercase tracking-wider">
          / 100
        </span>
      </div>
    </div>
  );
}

function AttributionPill({ owner }) {
  const isLearner = owner === "learner";
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider border"
      style={{
        color: isLearner ? "#59E8A6" : "#8C8C92",
        borderColor: isLearner ? "rgba(89,232,166,0.35)" : "#232326",
        background: isLearner ? "rgba(89,232,166,0.08)" : "transparent",
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {isLearner ? <UserCheck size={11} /> : <Bot size={11} />}
      {isLearner ? "Learner" : "AI · context"}
    </span>
  );
}

function CompetencyCard({ c, i, open, onToggle }) {
  const Icon = c.icon;
  const color = bandColor(c.band);
  return (
    <motion.div
      custom={i}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      variants={fadeUp}
      className="rounded-xl border border-[#232326] bg-[#131315] overflow-hidden"
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-5 p-6 text-left hover:bg-[#17171a] transition-colors"
      >
        <div
          className="w-11 h-11 rounded-md flex items-center justify-center shrink-0"
          style={{ background: `${color}1A` }}
        >
          <Icon size={18} style={{ color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3
              className="text-lg md:text-xl"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {c.n}
            </h3>
            <span
              className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border"
              style={{ color, borderColor: `${color}55` }}
            >
              {c.band}
            </span>
          </div>
          <p className="text-sm text-[#8C8C92] mt-1 truncate">{c.q}</p>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <span
            className="text-2xl font-semibold"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color }}
          >
            {c.score}
          </span>
          <span className="text-xs text-[#8C8C92]">/100</span>
        </div>

        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="shrink-0"
        >
          <ChevronDown size={18} className="text-[#8C8C92]" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pt-1 border-t border-[#1c1c1e]">
              <div className="grid md:grid-cols-[1fr_1.4fr] gap-8 mt-5">
                <div>
                  <div className="flex items-center gap-2 text-[#8C8C92] text-xs uppercase tracking-wider mb-3">
                    <Quote size={13} />
                    Reasoning
                  </div>
                  <p className="text-sm leading-relaxed text-[#EDEDEE]/90">
                    {c.reasoning}
                  </p>
                  {c.note && (
                    <p
                      className="mt-4 text-sm font-medium"
                      style={{ color: "#D7FF3F" }}
                    >
                      {c.note}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 text-[#8C8C92] text-xs uppercase tracking-wider mb-3">
                    <Hash size={13} />
                    Evidence mapping
                  </div>
                  <div className="space-y-3">
                    {c.evidence.map((e, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-[#232326] bg-[#0A0A0B] p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="text-xs text-[#EDEDEE]"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            {e.type}
                          </span>
                          <AttributionPill owner={e.owner} />
                        </div>
                        <p className="text-sm text-[#8C8C92]">"{e.detail}"</p>
                      </div>
                    ))}

                    {c.aiContext && (
                      <div className="rounded-lg border border-dashed border-[#2c2c2f] bg-transparent p-4 opacity-80">
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="text-xs text-[#8C8C92]"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            {c.aiContext.type}
                          </span>
                          <AttributionPill owner={c.aiContext.owner} />
                        </div>
                        <p className="text-sm text-[#8C8C92]">
                          "{c.aiContext.detail}"
                        </p>
                        <p className="mt-2 text-[11px] text-[#FF6A57] flex items-center gap-1.5">
                          <X size={11} />
                          Context only — cannot satisfy learner evidence alone
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function CompetencyReceiptPage() {
  const [openKey, setOpenKey] = useState(competencies[0].key);

  return (
    <div
      className="min-h-screen w-full bg-[#0A0A0B] text-[#EDEDEE] selection:bg-[#D7FF3F] selection:text-black overflow-x-hidden"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <style>{FONT_IMPORT}</style>

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
          <button className="flex items-center gap-2 text-sm text-[#8C8C92] hover:text-[#EDEDEE] transition-colors">
            <ArrowLeft size={15} />
            Back to investigation
          </button>
        </div>
      </header>

      <main className="pt-32 pb-32 px-6 md:px-10 max-w-6xl mx-auto">
        {/* RECEIPT HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-3 mb-6"
        >
          <span className="h-px w-8 bg-[#D7FF3F]" />
          <span
            className="uppercase tracking-[0.25em] text-xs text-[#8C8C92]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Competency Receipt
          </span>
        </motion.div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-14">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.05 }}
            className="text-3xl sm:text-4xl md:text-6xl font-semibold tracking-tight max-w-2xl"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            An evidence-backed record of{" "}
            <span className="text-[#D7FF3F]">how you worked.</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="flex items-center gap-3"
          >
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-[#232326] text-sm hover:border-[#8C8C92] transition-colors">
              <Share2 size={15} />
              Share
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#EDEDEE] text-black text-sm font-medium hover:bg-[#D7FF3F] transition-colors">
              <Download size={15} />
              Export
            </button>
          </motion.div>
        </div>

        {/* RECEIPT SUMMARY CARD */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="relative rounded-2xl border border-[#232326] bg-[#131315] shadow-[0_0_80px_-20px_rgba(215,255,63,0.12)] mb-14"
        >
          <div className="p-8 md:p-10 flex flex-col md:flex-row md:items-center gap-10 border-b border-dashed border-[#2c2c2f]">
            <ScoreRing value={overallScore} />

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Receipt size={16} className="text-[#D7FF3F]" />
                <span
                  className="text-xs text-[#8C8C92]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {receiptMeta.id}
                </span>
                <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#59E8A6]/40 text-[#59E8A6]">
                  <CircleCheck size={11} />
                  {receiptMeta.status}
                </span>
              </div>
              <h2
                className="text-xl md:text-2xl mb-2"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {mission.org} — {mission.role}
              </h2>
              <p className="text-sm text-[#8C8C92] max-w-xl mb-4">
                {mission.problem}
              </p>
              <div className="flex flex-wrap gap-2">
                {mission.files.map((f) => (
                  <span
                    key={f}
                    className="px-2.5 py-1 rounded-md bg-[#0A0A0B] border border-[#232326] text-[11px] text-[#8C8C92]"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex md:flex-col gap-6 md:gap-4 shrink-0">
              <div className="flex items-center gap-2 text-xs text-[#8C8C92]">
                <Clock size={13} />
                {receiptMeta.generatedAt}
              </div>
              <div className="flex items-center gap-2 text-xs text-[#8C8C92]">
                <Lock size={13} />
                Immutable after generation
              </div>
            </div>
          </div>

          <div className="px-8 md:px-10 py-5 flex flex-wrap gap-3">
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

          {/* receipt notch edges */}
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#0A0A0B] border border-[#232326] hidden md:block" />
          <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#0A0A0B] border border-[#232326] hidden md:block" />
        </motion.div>

        {/* COMPETENCY BREAKDOWN */}
        <div className="flex items-center gap-3 mb-8">
          <span className="h-px w-8 bg-[#D7FF3F]" />
          <span
            className="uppercase tracking-[0.25em] text-xs text-[#8C8C92]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Competency Breakdown
          </span>
        </div>

        <div className="space-y-4">
          {competencies.map((c, i) => (
            <CompetencyCard
              key={c.key}
              c={c}
              i={i}
              open={openKey === c.key}
              onToggle={() => setOpenKey(openKey === c.key ? null : c.key)}
            />
          ))}
        </div>

        {/* TRACEABILITY FOOTER */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-16 rounded-xl border border-[#232326] bg-[#0F0F10] p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-md bg-[#D7FF3F]/10 flex items-center justify-center shrink-0">
              <ScaleIcon size={18} className="text-[#D7FF3F]" />
            </div>
            <div>
              <h3
                className="text-base mb-1"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Every score traces to a timeline event.
              </h3>
              <p className="text-sm text-[#8C8C92] max-w-xl">
                This receipt is generated from the completed investigation
                timeline. AI events provided context only — every competency
                is grounded in learner-owned evidence.
              </p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-[#232326] text-sm shrink-0 hover:border-[#8C8C92] transition-colors">
            View full timeline
            <ArrowRight size={14} />
          </button>
        </motion.div>
      </main>
    </div>
  );
}
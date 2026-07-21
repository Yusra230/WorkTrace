import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Fingerprint,
  ArrowRight,
  FileCode2,
  AlertTriangle,
  Bot,
  UserCheck,
  ShieldCheck,
  ChevronRight,
  Folder,
  FileText,
  TrendingDown,
  Building2,
  BadgeCheck,
  Play,
  Info,
} from "lucide-react";

/* ============================================================
   Theme tokens shared with WorkTraceLanding.jsx
   bg #0A0A0B · surface #131315 · line #232326 · ink #EDEDEE
   mute #8C8C92 · evidence #D7FF3F · verified #59E8A6 · flag #FF6A57
   Display: Space Grotesk · Body: Inter · Mono: JetBrains Mono
   ============================================================ */

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
`;

const missionFiles = [
  { path: "frontend/Checkout.js", type: "frontend" },
  { path: "frontend/Cart.js", type: "frontend" },
  { path: "backend/checkout.js", type: "backend" },
];

const expectations = [
  {
    icon: FileCode2,
    label: "What you're investigating",
    text: "A realistic engineering problem inside NovaCommerce's checkout flow.",
  },
  {
    icon: Folder,
    label: "What evidence is available",
    text: "Frontend and backend source files relevant to the checkout path.",
  },
  {
    icon: BadgeCheck,
    label: "What you're expected to determine",
    text: "What's causing the drop, and a solution you can defend.",
  },
  {
    icon: Bot,
    label: "AI assistance",
    text: "Available throughout — but every decision remains yours.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3 mb-5">
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

export default function MissionEntry() {
  const [acknowledged, setAcknowledged] = useState(false);
  const [starting, setStarting] = useState(false);

  const handleStart = () => {
    if (!acknowledged) return;
    setStarting(true);
  };

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

      {/* NAV */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#0A0A0B]/70 border-b border-[#232326]">
        <div className="max-w-6xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
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
          <span
            className="text-xs text-[#8C8C92] uppercase tracking-[0.2em]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Mission Entry
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 md:px-10 py-16 md:py-24">
        {/* MISSION HEADER */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="flex items-center gap-3 mb-8"
        >
          <span className="flex items-center gap-2 px-3 py-1 rounded-full border border-[#232326] text-xs text-[#8C8C92]">
            <Building2 size={12} className="text-[#D7FF3F]" />
            NovaCommerce
          </span>
          <span className="flex items-center gap-2 px-3 py-1 rounded-full border border-[#232326] text-xs text-[#8C8C92]">
            <UserCheck size={12} className="text-[#D7FF3F]" />
            Role: Junior Product Engineer
          </span>
        </motion.div>

        <motion.h1
          custom={1}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="text-4xl sm:text-5xl md:text-6xl leading-[1.05] font-semibold tracking-tight max-w-3xl"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Checkout conversion has{" "}
          <span className="text-[#FF6A57]">dropped by 12%.</span>
        </motion.h1>

        <motion.p
          custom={2}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="mt-6 text-base md:text-lg text-[#8C8C92] max-w-2xl"
        >
          Investigate the problem and determine what is happening. You'll work
          alongside an AI teammate — but the investigation, decisions, and
          final solution are yours to own.
        </motion.p>

        {/* METRIC STRIP */}
        <motion.div
          custom={3}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="mt-10 flex items-center gap-4 rounded-xl border border-[#232326] bg-[#131315] px-6 py-5 max-w-xl"
        >
          <div className="w-11 h-11 rounded-md bg-[#FF6A57]/10 flex items-center justify-center shrink-0">
            <TrendingDown size={20} className="text-[#FF6A57]" />
          </div>
          <div>
            <div
              className="text-2xl font-semibold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              -12%
            </div>
            <div className="text-xs text-[#8C8C92]">
              Checkout conversion, current period
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1 text-xs text-[#8C8C92]">
            <AlertTriangle size={13} className="text-[#D7FF3F]" />
            Signal flagged
          </div>
        </motion.div>

        {/* EXPECTATIONS GRID */}
        <div className="mt-20">
          <SectionLabel>Before You Begin</SectionLabel>
          <div className="grid sm:grid-cols-2 gap-5">
            {expectations.map((e, i) => {
              const Icon = e.icon;
              return (
                <motion.div
                  key={e.label}
                  custom={i}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  whileHover={{ y: -3 }}
                  className="rounded-xl border border-[#232326] bg-[#131315] p-6 hover:border-[#D7FF3F]/50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-md bg-[#D7FF3F]/10 flex items-center justify-center mb-4">
                    <Icon size={16} className="text-[#D7FF3F]" />
                  </div>
                  <h3
                    className="text-sm font-medium mb-2"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {e.label}
                  </h3>
                  <p className="text-sm text-[#8C8C92] leading-relaxed">
                    {e.text}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* EVIDENCE FILES */}
        <div className="mt-20">
          <SectionLabel>Investigation Context</SectionLabel>
          <div className="rounded-xl border border-[#232326] bg-[#131315] overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-[#232326] text-xs text-[#8C8C92]">
              <Folder size={14} className="text-[#D7FF3F]" />
              Available files
              <span
                className="ml-auto"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {missionFiles.length} files
              </span>
            </div>
            {missionFiles.map((f, i) => (
              <motion.div
                key={f.path}
                custom={i}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={fadeUp}
                className="flex items-center gap-3 px-6 py-4 border-b border-[#1c1c1e] last:border-b-0 hover:bg-white/[0.02] transition-colors group cursor-pointer"
              >
                <FileText size={15} className="text-[#8C8C92] group-hover:text-[#D7FF3F] transition-colors" />
                <span
                  className="text-sm"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {f.path}
                </span>
                <span className="ml-auto text-[10px] uppercase tracking-wider text-[#8C8C92] px-2 py-0.5 rounded-full border border-[#232326]">
                  {f.type}
                </span>
                <ChevronRight size={14} className="text-[#8C8C92] group-hover:translate-x-1 transition-transform" />
              </motion.div>
            ))}
          </div>
        </div>

        {/* AI / HUMAN RESPONSIBILITY NOTICE */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-20 rounded-xl border border-[#232326] bg-[#0F0F10] p-8 flex flex-col md:flex-row gap-8"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Bot size={16} className="text-[#8C8C92]" />
              <span
                className="text-sm text-[#8C8C92]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                AI Teammate
              </span>
            </div>
            <p className="text-sm text-[#EDEDEE]/80 leading-relaxed">
              Available to inform, suggest, and help you investigate. AI
              output is context — it is never automatic proof of your
              competency.
            </p>
          </div>
          <div className="hidden md:block w-px bg-[#232326]" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <UserCheck size={16} className="text-[#D7FF3F]" />
              <span
                className="text-sm text-[#D7FF3F]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                You
              </span>
            </div>
            <p className="text-sm text-[#EDEDEE]/80 leading-relaxed">
              Responsible for every decision: what you investigate, what you
              accept or reject, how you verify, and what you submit.
            </p>
          </div>
        </motion.div>

        {/* ACKNOWLEDGEMENT + START */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-14 flex flex-col items-start gap-6"
        >
          <label className="flex items-start gap-3 cursor-pointer group max-w-xl">
            <span
              onClick={() => setAcknowledged((v) => !v)}
              className={`mt-0.5 shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                acknowledged
                  ? "bg-[#D7FF3F] border-[#D7FF3F]"
                  : "border-[#232326] group-hover:border-[#8C8C92]"
              }`}
            >
              {acknowledged && (
                <motion.svg
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                >
                  <path
                    d="M2 6l3 3 5-6"
                    stroke="black"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </motion.svg>
              )}
            </span>
            <span className="text-sm text-[#8C8C92]">
              I understand this investigation will be recorded as an evidence
              timeline, and that my decisions — not the AI's output — are
              what get evaluated.
            </span>
          </label>

          <button
            onClick={handleStart}
            disabled={!acknowledged}
            className={`group flex items-center gap-2 px-7 py-3.5 rounded-md font-medium transition-all ${
              acknowledged
                ? "bg-[#D7FF3F] text-black hover:bg-white"
                : "bg-[#131315] text-[#8C8C92] border border-[#232326] cursor-not-allowed"
            }`}
          >
            <Play size={16} />
            Start Investigation
            <ArrowRight
              size={16}
              className={acknowledged ? "group-hover:translate-x-1 transition-transform" : ""}
            />
          </button>

          <div className="flex items-center gap-2 text-xs text-[#8C8C92]">
            <Info size={13} />
            <ShieldCheck size={13} className="text-[#59E8A6]" />
            Your session will begin a timestamped evidence timeline
          </div>
        </motion.div>
      </main>

      {/* STARTING TRANSITION OVERLAY */}
      <AnimatePresence>
        {starting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#0A0A0B] flex flex-col items-center justify-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
              className="w-14 h-14 rounded-full border-2 border-[#232326] border-t-[#D7FF3F] mb-8"
            />
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-sm text-[#8C8C92]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Opening investigation workspace…
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
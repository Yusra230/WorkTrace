import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Fingerprint,
  FileSearch,
  ShieldCheck,
  ScaleIcon,
  MessageSquareText,
  FileCheck2,
  Sparkles,
  Lock,
  Receipt,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

/* ============================================================
   Theme tokens shared with WorkTraceLanding.jsx / MissionEntry.jsx
   ============================================================ */

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
`;

const stages = [
  {
    label: "Persisting evaluation timeline",
    detail: "Sanitizing the completed investigation for evaluation.",
    icon: Lock,
  },
  {
    label: "Grounding evidence",
    detail: "Mapping learner-owned events — decisions, verification, explanation.",
    icon: FileSearch,
  },
  {
    label: "Running semantic evaluation",
    detail: "Gemini evaluates competency against evidence-rubric-v1.",
    icon: Sparkles,
  },
  {
    label: "Validating competency mappings",
    detail: "Checking all five dimensions have grounded, non-empty evidence.",
    icon: ShieldCheck,
  },
  {
    label: "Generating Competency Receipt",
    detail: "Compiling scores, reasoning, and traceable evidence.",
    icon: Receipt,
  },
];

const competencies = [
  { label: "Technical Execution", icon: FileCheck2 },
  { label: "Problem Framing", icon: FileSearch },
  { label: "AI Verification", icon: ShieldCheck },
  { label: "Independent Judgment", icon: ScaleIcon },
  { label: "Communication", icon: MessageSquareText },
];

export default function EvaluationTransition({ error, onGenerate, onRetry, onViewReceipt, status }) {
  const [stageIndex, setStageIndex] = useState(0);
  const [checked, setChecked] = useState([]);
  const generatedForReadyState = useRef(false);
  const isComplete = status === "completed";
  const isError = status === "error";

  useEffect(() => {
    if (status === "ready" && !generatedForReadyState.current) {
      generatedForReadyState.current = true;
      onGenerate();
    }
    if (status !== "ready") generatedForReadyState.current = false;
  }, [onGenerate, status]);

  useEffect(() => {
    if (status !== "generating" || stageIndex >= stages.length - 1) return undefined;
    const t = setTimeout(() => {
      setChecked((prev) => (prev.includes(stageIndex) ? prev : [...prev, stageIndex]));
      setStageIndex((i) => i + 1);
    }, 1500);
    return () => clearTimeout(t);
  }, [stageIndex, status]);

  const progress = isComplete ? 1 : Math.min(stageIndex / stages.length, 1);

  return (
    <div
      className="min-h-screen w-full bg-[#0A0A0B] text-[#EDEDEE] selection:bg-[#D7FF3F] selection:text-black overflow-hidden flex flex-col"
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

      {/* ambient glow */}
      <motion.div
        animate={{ opacity: [0.15, 0.35, 0.15] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none fixed left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full blur-[140px]"
        style={{ background: "#D7FF3F22" }}
      />

      {/* NAV */}
      <header className="relative z-10 border-b border-[#232326]">
        <div className="max-w-5xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
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
            Evaluation
          </span>
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-3xl mx-auto w-full px-6 md:px-10 py-16 md:py-24 flex flex-col items-center">
        <AnimatePresence mode="wait">
          {isError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-md flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 rounded-full bg-[#FF6A57]/10 border border-[#FF6A57]/40 flex items-center justify-center mb-8">
                <AlertTriangle size={26} className="text-[#FF6A57]" />
              </div>
              <span className="uppercase tracking-[0.25em] text-xs text-[#8C8C92] mb-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Evaluation paused</span>
              <h1 className="text-3xl font-semibold tracking-tight mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Your evidence is safely preserved.</h1>
              <p role="alert" className="text-sm text-[#8C8C92] max-w-md mb-8">{error || "The evaluator is temporarily unavailable. Retry when you are ready."}</p>
              <button type="button" onClick={onRetry} className="group flex items-center gap-2 px-7 py-3.5 rounded-md bg-[#D7FF3F] text-black font-medium hover:bg-white transition-colors"><RefreshCw size={16} />Retry evaluation</button>
            </motion.div>
          ) : !isComplete ? (
            <motion.div
              key="evaluating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5 }}
              className="w-full flex flex-col items-center"
            >
              {/* scanning ring */}
              <div className="relative w-28 h-28 mb-10">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#D7FF3F] border-r-[#D7FF3F]/30"
                />
                <div className="absolute inset-3 rounded-full border border-[#232326] bg-[#131315] flex items-center justify-center">
                  <motion.div
                    key={stageIndex}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.35 }}
                  >
                    {React.createElement(
                      stages[Math.min(stageIndex, stages.length - 1)].icon,
                      { size: 26, className: "text-[#D7FF3F]" }
                    )}
                  </motion.div>
                </div>
              </div>

              <span
                className="uppercase tracking-[0.25em] text-xs text-[#8C8C92] mb-3"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Evaluating your investigation
              </span>
              <h1
                className="text-2xl md:text-3xl font-semibold tracking-tight text-center mb-2"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {stages[Math.min(stageIndex, stages.length - 1)].label}
              </h1>
              <p className="text-sm text-[#8C8C92] text-center max-w-md mb-12">
                {stages[Math.min(stageIndex, stages.length - 1)].detail}
              </p>

              {/* progress bar */}
              <div className="w-full max-w-md h-1 rounded-full bg-[#131315] overflow-hidden mb-10">
                <motion.div
                  className="h-full bg-[#D7FF3F]"
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                />
              </div>

              {/* stage checklist */}
              <div className="w-full max-w-md rounded-xl border border-[#232326] bg-[#131315] divide-y divide-[#1c1c1e]">
                {stages.map((s, i) => {
                  const Icon = s.icon;
                  const isChecked = checked.includes(i);
                  const isActive = i === stageIndex;
                  return (
                    <div
                      key={s.label}
                      className={`flex items-center gap-3 px-5 py-3.5 transition-opacity ${
                        !isChecked && !isActive ? "opacity-40" : "opacity-100"
                      }`}
                    >
                      {isChecked ? (
                        <CheckCircle2 size={16} className="text-[#59E8A6] shrink-0" />
                      ) : isActive ? (
                        <Loader2 size={16} className="text-[#D7FF3F] shrink-0 animate-spin" />
                      ) : (
                        <Icon size={16} className="text-[#8C8C92] shrink-0" />
                      )}
                      <span
                        className="text-sm"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="mt-8 text-xs text-[#8C8C92] flex items-center gap-2">
                <Lock size={12} />
                Evidence timeline sanitized · Gemini semantic evaluator ·
                evidence-rubric-v1
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="w-full flex flex-col items-center text-center"
            >
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, type: "spring" }}
                className="w-16 h-16 rounded-full bg-[#D7FF3F]/10 border border-[#D7FF3F]/40 flex items-center justify-center mb-8"
              >
                <Receipt size={26} className="text-[#D7FF3F]" />
              </motion.div>

              <span
                className="uppercase tracking-[0.25em] text-xs text-[#8C8C92] mb-3"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Evaluation complete
              </span>
              <h1
                className="text-3xl md:text-4xl font-semibold tracking-tight mb-3"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Your Competency Receipt is ready.
              </h1>
              <p className="text-sm text-[#8C8C92] max-w-md mb-10">
                All five competencies were evaluated and grounded in your
                own evidence timeline.
              </p>

              <div className="w-full max-w-md grid grid-cols-1 gap-2.5 mb-10">
                {competencies.map((c, i) => {
                  const Icon = c.icon;
                  return (
                    <motion.div
                      key={c.label}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[#232326] bg-[#131315]"
                    >
                      <Icon size={15} className="text-[#D7FF3F]" />
                      <span
                        className="text-sm"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {c.label}
                      </span>
                      <CheckCircle2 size={14} className="text-[#59E8A6] ml-auto" />
                    </motion.div>
                  );
                })}
              </div>

              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                type="button"
                onClick={onViewReceipt}
                className="group flex items-center gap-2 px-7 py-3.5 rounded-md bg-[#D7FF3F] text-black font-medium hover:bg-white transition-colors"
              >
                View Competency Receipt
                <Receipt size={16} />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

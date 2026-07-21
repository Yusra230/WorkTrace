import React, { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Editor from "@monaco-editor/react";
import { useDispatch, useSelector } from "react-redux";
import {
  Fingerprint,
  Folder,
  FileCode2,
  Bot,
  UserCheck,
  Check,
  X,
  ShieldCheck,
  Send,
  Clock,
  ChevronRight,
  FileSearch,
  MessageSquareText,
  ClipboardList,
  Sparkles,
  CircleDot,
  ArrowRight,
  FlaskConical,
  ScaleIcon,
  FileCheck2,
  MessageCircleQuestion,
  Loader2,
} from "lucide-react";
import { novaCommerceCodebase } from "../data/novaCommerceCodebase";
import {
  applicationViews,
  clearEvidenceError,
  clearRecoverableError,
  collectEvidence,
  recordSuggestionDecision,
  sendChat,
  setCurrentView,
  setFollowUpAnswer,
  setSelectedFilePath,
  setSubmissionField,
  setVerificationRationale,
  submitFollowUp,
  submitSolution,
  verifySuggestionDecision,
} from "../features/worktrace/worktraceSlice";

/* ============================================================
   Same token system as the WorkTrace landing page.
   bg #0A0A0B · surface #131315 · line #232326 · ink #EDEDEE
   mute #8C8C92 · evidence(lime) #D7FF3F · verified #59E8A6 · ai #7FB2FF
   flag #FF6A57
   Display: Space Grotesk · Body: Inter · Mono: JetBrains Mono
   ============================================================ */

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
`;

/* ------------------------------------------------------------
   Canonical event model (matches real WorkTrace attribution).
   ------------------------------------------------------------ */
const EVENT_META = {
  mission: { who: "system", evidenceType: null },
  user_prompt: { who: "learner", evidenceType: "investigation_question_or_reasoning" },
  ai_response: { who: "ai_teammate", evidenceType: null },
  evidence_collected: { who: "learner", evidenceType: "learner_selected_evidence" },
  suggestion_offered: { who: "ai_teammate", evidenceType: null },
  suggestion_accepted: { who: "learner", evidenceType: "decision" },
  suggestion_rejected: { who: "learner", evidenceType: "decision" },
  user_decision: { who: "learner", evidenceType: "decision" },
  suggestion_verified: { who: "learner", evidenceType: "verification" },
  submission: { who: "learner", evidenceType: "final_solution" },
  follow_up_answer: { who: "learner", evidenceType: "independent_explanation" },
};

const attributionStyle = {
  ai_teammate: { label: "AI Teammate", icon: Bot, color: "#7FB2FF", bg: "bg-[#7FB2FF]/10", ring: "border-[#7FB2FF]/30" },
  learner: { label: "You", icon: UserCheck, color: "#D7FF3F", bg: "bg-[#D7FF3F]/10", ring: "border-[#D7FF3F]/30" },
  system: { label: "System", icon: CircleDot, color: "#8C8C92", bg: "bg-[#8C8C92]/10", ring: "border-[#8C8C92]/20" },
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

export function getCodeLanguage(filePath = "") {
  return /\.(?:jsx?|mjs|cjs)$/i.test(filePath) ? "javascript" : "plaintext";
}

export function getCodeViewerHeight(content = "", viewportHeight = 900) {
  const lineCount = Math.max(1, String(content).split("\n").length);
  const contentHeight = lineCount * 22 + 32;
  const viewportCap = Math.min(672, Math.max(280, Math.round(viewportHeight * 0.58)));
  return Math.min(Math.max(176, contentHeight), viewportCap);
}

function configureWorktraceEditor(monaco) {
  monaco.editor.defineTheme("worktrace-investigation", {
    base: "vs-dark",
    inherit: true,
    colors: {
      "editor.background": "#131315",
      "editor.foreground": "#EDEDEE",
      "editorLineNumber.foreground": "#5A5A5E",
      "editorLineNumber.activeForeground": "#8C8C92",
      "editorCursor.foreground": "#D7FF3F",
      "editor.selectionBackground": "#D7FF3F24",
      "editor.inactiveSelectionBackground": "#D7FF3F16",
      "editor.lineHighlightBackground": "#1A1A1D",
      "editorGutter.background": "#131315",
      "scrollbarSlider.background": "#D7FF3F66",
      "scrollbarSlider.hoverBackground": "#D7FF3F99",
      "scrollbarSlider.activeBackground": "#D7FF3FCC",
    },
    rules: [
      { token: "keyword", foreground: "D7FF3F" },
      { token: "string", foreground: "59E8A6" },
      { token: "comment", foreground: "6B6B72", fontStyle: "italic" },
      { token: "number", foreground: "FFB86C" },
      { token: "delimiter", foreground: "C7C7CD" },
      { token: "identifier", foreground: "EDEDEE" },
      { token: "type.identifier", foreground: "7FB2FF" },
    ],
  });
}

function isNearScrollBottom(element, threshold = 56) {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= threshold;
}

function AttributionTag({ who }) {
  const a = attributionStyle[who];
  const Icon = a.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] border ${a.ring} ${a.bg}`}
      style={{ color: a.color, fontFamily: "'JetBrains Mono', monospace" }}
    >
      <Icon size={11} />
      {a.label}
    </span>
  );
}

function EvidenceMarker({ who, evidenceType }) {
  if (who === "ai_teammate") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-[#8C8C92]">
        <Sparkles size={10} />
        context only — not competency evidence
      </span>
    );
  }
  if (who === "learner" && evidenceType) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-[#59E8A6]">
        <ShieldCheck size={10} />
        learner-owned evidence
      </span>
    );
  }
  return null;
}

const competencyCopy = [
  { n: "01", label: "Problem Framing", metText: "Evidence captured", pendingText: "Awaiting investigation evidence" },
  { n: "02", label: "AI Verification", metText: "Verification recorded", pendingText: "Awaiting verification" },
  { n: "03", label: "Independent Judgment", metText: "Decision and explanation recorded", pendingText: "Awaiting decision and explanation" },
  { n: "04", label: "Technical Execution", metText: "Final solution recorded", pendingText: "Awaiting final solution" },
  { n: "05", label: "Communication", metText: "Explanation recorded", pendingText: "Awaiting final solution or explanation" },
];

export default function InvestigationWorkspace() {
  const dispatch = useDispatch();
  const worktrace = useSelector((state) => state.worktrace);
  const {
    chatTranscript, currentView, evidenceError, evidenceItems, followUp, loading,
    mission, offeredSuggestion, recoverableError, selectedFilePath, submission,
    suggestionDecision, suggestionId, verification,
  } = worktrace;
  const files = novaCommerceCodebase.files;
  const activeFile = files.find((file) => file.path === selectedFilePath) || files[0];
  const activeFilePath = activeFile?.path || "";
  const isWorkspace = currentView === applicationViews.WORKSPACE;
  const isSubmission = currentView === applicationViews.SUBMISSION;
  const isFollowUp = currentView === applicationViews.FOLLOW_UP;
  const isEvaluating = currentView === applicationViews.EVALUATING;
  const hasSubmittedFollowUp = Boolean(followUp.submittedAnswer);
  const [note, setNote] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [tab, setTab] = useState("code");
  const [viewportHeight, setViewportHeight] = useState(() => typeof window === "undefined" ? 900 : window.innerHeight);
  const conversationScrollRef = useRef(null);
  const shouldFocusConversationRef = useRef(false);
  const shouldAutoScrollConversationRef = useRef(true);
  const previousChatCountRef = useRef(chatTranscript.length);
  const [independentOpen, setIndependentOpen] = useState(false);
  const [independentText, setIndependentText] = useState("");
  const timeline = [
    ...(mission ? [{ id: "mission", eventType: "mission", body: mission.description || mission.title || "Mission started" }] : []),
    ...chatTranscript.map((message) => ({ id: message.id, eventType: message.role === "teammate" ? "ai_response" : "user_prompt", body: message.content, status: message.status })),
    ...evidenceItems.map((item) => ({ id: item.id, eventType: "evidence_collected", body: item.description || item.title })),
    ...(offeredSuggestion ? [{ id: suggestionId || "suggestion", eventType: "suggestion_offered", body: offeredSuggestion.message, pending: !suggestionDecision }] : []),
    ...(suggestionDecision ? [{ id: `decision-${suggestionDecision}`, eventType: suggestionDecision === "accepted" ? "suggestion_accepted" : "suggestion_rejected", body: `${suggestionDecision === "accepted" ? "Accepted" : "Rejected"} the AI suggestion.` }] : []),
    ...(verification.status === "completed" ? [{ id: "verification", eventType: "suggestion_verified", body: verification.rationale || "Verification recorded." }] : []),
    ...(submission.solution ? [{ id: "submission", eventType: "submission", body: submission.solution }] : []),
    ...(hasSubmittedFollowUp ? [{ id: "follow-up", eventType: "follow_up_answer", body: followUp.submittedAnswer }] : []),
  ];
  const conversationTimeline = [
    ...(mission ? [{ id: "mission", eventType: "mission", body: mission.description || mission.title || "Mission started" }] : []),
    ...chatTranscript.map((message) => ({ id: message.id, eventType: message.role === "teammate" ? "ai_response" : "user_prompt", body: message.content, status: message.status })),
  ];



  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const updateViewportHeight = () => setViewportHeight(window.innerHeight);
    window.addEventListener("resize", updateViewportHeight);
    return () => window.removeEventListener("resize", updateViewportHeight);
  }, []);

  useEffect(() => {
    const hasNewChat = chatTranscript.length > previousChatCountRef.current;
    previousChatCountRef.current = chatTranscript.length;
    if (!hasNewChat) return;

    const wasNewSubmission = shouldFocusConversationRef.current;
    const shouldScroll = wasNewSubmission || shouldAutoScrollConversationRef.current;
    shouldFocusConversationRef.current = false;
    if (wasNewSubmission) setTab("timeline");

    if (!shouldScroll) return;
    requestAnimationFrame(() => {
      const container = conversationScrollRef.current;
      if (!container) return;
      container.scrollTo?.({ top: container.scrollHeight, behavior: "smooth" });
      shouldAutoScrollConversationRef.current = true;
    });
  }, [chatTranscript.length]);

  useEffect(() => {
    if (isSubmission) setTab("submission");
    if (isFollowUp) setTab("followup");
  }, [isFollowUp, isSubmission]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  const pendingSuggestion = timeline.find((e) => e.pending);
  const decisionEvents = timeline.filter((e) => ["suggestion_accepted", "suggestion_rejected", "user_decision"].includes(e.eventType));
  const verificationEvents = timeline.filter((e) => e.eventType === "suggestion_verified");
  const followupEvents = timeline.filter((e) => e.eventType === "follow_up_answer");
  const decisionAndVerificationEvents = timeline.filter((e) => ["suggestion_accepted", "suggestion_rejected", "user_decision", "suggestion_verified"].includes(e.eventType));

  function resolveSuggestion(outcome, reasoning) {
    if (outcome === "independent") {
      dispatch(setVerificationRationale(reasoning));
      setIndependentOpen(false);
      return;
    }
    if (!pendingSuggestion || loading.logDecision) return;
    dispatch(recordSuggestionDecision(outcome));
  }

  function recordVerification() {
    if (loading.verifyDecision) return;
    dispatch(verifySuggestionDecision());
  }

  function addNote() {
    if (!note.trim() || loading.sendChat) return;
    shouldFocusConversationRef.current = true;
    shouldAutoScrollConversationRef.current = true;
    setTab("timeline");
    dispatch(sendChat(note.trim()));
    setNote("");
  }

  function handleConversationScroll(event) {
    shouldAutoScrollConversationRef.current = isNearScrollBottom(event.currentTarget);
  }

  function submitFinalSolution() {
    if (!submission.solution.trim() || !submission.justification.trim()) return;
    dispatch(submitSolution());
  }

  function submitFollowup() {
    if (!followUp.answer.trim() || loading.submitFollowUp || hasSubmittedFollowUp) return;
    dispatch(submitFollowUp());
  }

  const competencyMet = {
    "Problem Framing": timeline.some((e) => ["user_prompt", "evidence_collected"].includes(e.eventType)),
    "AI Verification": verificationEvents.length > 0,
    "Independent Judgment": decisionEvents.length > 0 && followupEvents.length > 0,
    "Technical Execution": Boolean(submission.solution),
    Communication: Boolean(submission.solution) || followupEvents.length > 0,
  };

  return (
    <div
      className="h-screen w-full bg-[#0A0A0B] text-[#EDEDEE] flex flex-col overflow-hidden selection:bg-[#D7FF3F] selection:text-black"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <style>{FONT_IMPORT}</style>

      <div
        className="fixed inset-0 pointer-events-none opacity-[0.04]"
        style={{ backgroundImage: "linear-gradient(#EDEDEE 1px, transparent 1px), linear-gradient(90deg, #EDEDEE 1px, transparent 1px)", backgroundSize: "48px 48px" }}
      />

      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-20 h-16 shrink-0 border-b border-[#232326] bg-[#0A0A0B]/90 backdrop-blur-md flex items-center justify-between px-5 md:px-8"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-8 h-8 rounded-md bg-[#D7FF3F] flex items-center justify-center shrink-0">
            <Fingerprint size={16} className="text-black" />
          </div>
          <div className="min-w-0">
            <div className="text-sm md:text-base font-semibold tracking-tight truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {mission?.company || "WorkTrace"}{mission?.role ? ` — ${mission.role}` : ""}
            </div>
            <div className="text-[11px] text-[#8C8C92] truncate">{mission?.title || mission?.description || "Investigation workspace"}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-5 shrink-0">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#232326] text-xs text-[#8C8C92]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            <Clock size={13} />
            {mm}:{ss}
          </div>
          <span className="hidden md:inline-flex items-center gap-2 text-xs text-[#59E8A6]">
            <CircleDot size={10} className="fill-[#59E8A6]" />
            {loading.sendChat ? "AI teammate is responding" : isEvaluating ? "Follow-up complete" : isFollowUp ? "Follow-up in progress" : isSubmission ? "Final proposal" : "Investigation active"}
          </span>

          {isWorkspace && verification.status === "completed" && (
            <button onClick={() => dispatch(setCurrentView(applicationViews.SUBMISSION))} className="flex items-center gap-2 px-4 py-2 rounded-md bg-[#D7FF3F] text-black text-sm font-medium hover:bg-white transition-colors">
              Submit Final Solution
              <ArrowRight size={14} />
            </button>
          )}
          {isFollowUp && (
            <span className="flex items-center gap-2 px-4 py-2 rounded-md border border-[#232326] text-sm text-[#8C8C92]">
              <FileCheck2 size={14} className="text-[#59E8A6]" />
              Solution recorded — follow-up pending
            </span>
          )}
          {isEvaluating && (
            <span className="flex items-center gap-2 px-4 py-2 rounded-md border border-[#232326] text-sm text-[#8C8C92]">
              <Loader2 size={14} className="animate-spin text-[#D7FF3F]" />
              Generating Competency Receipt
            </span>
          )}
        </div>
      </motion.header>

      {(recoverableError || evidenceError) && (
        <div role="alert" className="relative z-30 mx-5 mt-3 flex items-center justify-between gap-3 rounded-md border border-[#FF6A57]/40 bg-[#FF6A57]/10 px-4 py-2 text-sm text-[#EDEDEE]">
          <span>{recoverableError || evidenceError}</span>
          <button type="button" onClick={() => { dispatch(clearRecoverableError()); dispatch(clearEvidenceError()); }} className="text-xs text-[#FF6A57] underline">Dismiss</button>
        </div>
      )}

      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-[260px_1fr_340px] overflow-hidden">
        <motion.aside
          initial={{ x: -24, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="worktrace-internal-scroll hidden lg:flex flex-col border-r border-[#232326] bg-[#0F0F10] overflow-y-auto"
        >
          <div className="p-5 border-b border-[#1c1c1e]">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#8C8C92] mb-3">
              <span className="h-px w-4 bg-[#D7FF3F]" />
              Mission
            </div>
            <p className="text-sm text-[#EDEDEE]/90 leading-relaxed">
              {mission?.description || "Investigate the available signals, collect evidence deliberately, and document your reasoning."}
            </p>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-[#8C8C92]">
              <Bot size={12} className="text-[#7FB2FF]" />
              AI teammate available — you remain responsible for decisions.
            </div>
          </div>

          <div className="p-5">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#8C8C92] mb-3">
              <span className="h-px w-4 bg-[#D7FF3F]" />
              Files
            </div>
            <div className="space-y-1">
              {files.map((f) => (
                <button
                  key={f.path}
                  onClick={() => { dispatch(setSelectedFilePath(f.path)); setTab("code"); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors ${
                    activeFilePath === f.path ? "bg-[#D7FF3F]/10 text-[#D7FF3F] border border-[#D7FF3F]/30" : "text-[#8C8C92] hover:text-[#EDEDEE] hover:bg-[#151517] border border-transparent"
                  }`}
                >
                  <FileCode2 size={14} className="shrink-0" />
                  <span className="truncate font-mono text-xs">{f.path}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 border-t border-[#1c1c1e]">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#8C8C92] mb-3">
              <span className="h-px w-4 bg-[#59E8A6]" />
              Investigation Evidence
            </div>
            <div className="space-y-2">
              <AnimatePresence>
                {evidenceItems.map((ev) => (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex items-start gap-2 text-xs text-[#EDEDEE]/80 bg-[#131315] border border-[#232326] rounded-md px-3 py-2"
                  >
                    <FileSearch size={12} className="text-[#59E8A6] mt-0.5 shrink-0" />
                    {ev.title || ev.description}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <div className="mt-auto p-5 border-t border-[#1c1c1e]">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#8C8C92] mb-3">
              <span className="h-px w-4 bg-[#D7FF3F]" />
              Final Solution
            </div>
            {submission.solution ? (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-[#EDEDEE]/80 bg-[#D7FF3F]/[0.06] border border-[#D7FF3F]/25 rounded-md px-3 py-2 flex items-start gap-2">
                <FileCheck2 size={12} className="text-[#D7FF3F] mt-0.5 shrink-0" />
                {submission.solution}
              </motion.div>
            ) : (
              <p className="text-xs text-[#5a5a5e] italic">Not yet submitted — kept separate from investigation evidence.</p>
            )}
          </div>
        </motion.aside>

        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-col overflow-hidden border-r border-[#232326]"
        >
          <div className="flex items-center gap-1 px-5 pt-4 border-b border-[#1c1c1e] shrink-0">
            {[
              { id: "code", label: "Code", icon: FileCode2 },
              { id: "timeline", label: "AI Conversation", icon: MessageSquareText },
              ...(isSubmission ? [{ id: "submission", label: "Final solution", icon: FileCheck2 }] : []),
              ...(isFollowUp ? [{ id: "followup", label: "Follow-up", icon: MessageCircleQuestion }] : []),
            ].map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} className="relative flex items-center gap-2 px-4 py-2.5 text-sm transition-colors">
                  <Icon size={14} className={active ? "text-[#D7FF3F]" : "text-[#8C8C92]"} />
                  <span className={active ? "text-[#EDEDEE]" : "text-[#8C8C92]"}>{t.label}</span>
                  {active && <motion.span layoutId="tab-underline" className="absolute left-0 right-0 -bottom-px h-[2px] bg-[#D7FF3F]" />}
                </button>
              );
            })}
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            {tab === "code" && (
              <motion.div key={activeFilePath} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="worktrace-code-pane h-full overflow-y-auto p-6">
                <div className="flex items-center gap-2 mb-4 text-xs text-[#8C8C92]">
                  <Folder size={13} />
                  {activeFilePath}
                </div>
                <div className="rounded-lg border border-[#232326] bg-[#131315] overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#1c1c1e] text-[11px] text-[#8C8C92]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF6A57]/60" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#D7FF3F]/60" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#59E8A6]/60" />
                  </div>
                  <div className="worktrace-code-editor" aria-label={`${activeFilePath} read-only source code`}>
                    <Editor
                      beforeMount={configureWorktraceEditor}
                      defaultLanguage="javascript"
                      language={getCodeLanguage(activeFilePath)}
                      loading={<div className="p-5 font-mono text-xs text-[#8C8C92]">Loading source…</div>}
                      options={{
                        automaticLayout: true,
                        contextmenu: false,
                        fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace",
                        fontSize: 13,
                        lineHeight: 22,
                        lineNumbers: "on",
                        minimap: { enabled: false },
                        overviewRulerLanes: 0,
                        padding: { top: 16, bottom: 16 },
                        readOnly: true,
                        renderLineHighlight: "all",
                        scrollBeyondLastLine: false,
                        smoothScrolling: true,
                        wordWrap: "off",
                      }}
                      theme="worktrace-investigation"
                      value={activeFile?.content || "No file content is available."}
                      height={getCodeViewerHeight(activeFile?.content, viewportHeight)}
                    />
                  </div>
                </div>

                <button
                  onClick={() => dispatch(collectEvidence({
                    title: activeFilePath,
                    description: `Reviewed ${activeFilePath} as part of the investigation.`,
                    source: "Learner investigation",
                    type: "code",
                    relation: "neutral",
                    linkedHypothesisId: suggestionId || null,
                    createdBy: "learner",
                  }))}
                  disabled={loading.persistEvidence}
                  className="mt-4 flex items-center gap-2 px-4 py-2 rounded-md border border-[#232326] text-sm text-[#EDEDEE]/80 hover:border-[#59E8A6]/50 hover:text-[#59E8A6] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FileSearch size={14} />
                  {loading.persistEvidence ? "Saving selected evidence…" : "Mark as selected evidence"}
                </button>
              </motion.div>
            )}

            {tab === "timeline" && (
              <div
                ref={conversationScrollRef}
                onScroll={handleConversationScroll}
                data-testid="conversation-scroll-region"
                className="worktrace-conversation-scroll h-full overflow-y-auto overscroll-contain"
                aria-label="AI Conversation"
              >
                <div className="p-6 space-y-4">
                <AnimatePresence initial={false}>
                  {conversationTimeline.map((e) => {
                    const meta = EVENT_META[e.eventType] || { who: "system", evidenceType: null };
                    return (
                      <motion.div
                        key={e.id}
                        variants={fadeUp}
                        initial="hidden"
                        animate="show"
                        exit={{ opacity: 0 }}
                        className={`rounded-lg border p-4 ${
                          meta.who === "ai_teammate" ? "border-[#7FB2FF]/25 bg-[#7FB2FF]/[0.04]" : meta.who === "learner" ? "border-[#D7FF3F]/25 bg-[#D7FF3F]/[0.04]" : "border-[#232326] bg-[#131315]"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-y-1">
                          <div className="flex items-center gap-2">
                            <AttributionTag who={meta.who} />
                            <span className="text-[11px] text-[#8C8C92]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                              {e.eventType}
                            </span>
                          </div>
                          {e.status === "pending" ? (
                            <span className="flex items-center gap-1 text-[10px] text-[#7FB2FF]">
                              <Loader2 size={10} className="animate-spin" />
                              Thinking…
                            </span>
                          ) : e.status === "failed" ? (
                            <span className="text-[10px] text-[#FF6A57]">Not delivered</span>
                          ) : e.pending ? (
                            <span className="flex items-center gap-1 text-[10px] text-[#8C8C92]">
                              <span className="flex gap-0.5">
                                {[0, 1, 2].map((i) => (
                                  <motion.span key={i} className="w-1 h-1 rounded-full bg-[#7FB2FF]" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
                                ))}
                              </span>
                              awaiting your decision
                            </span>
                          ) : (
                            <EvidenceMarker who={meta.who} evidenceType={meta.evidenceType} />
                          )}
                        </div>
                        <p className="text-sm text-[#EDEDEE]/90 leading-relaxed">{e.body}</p>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                </div>
              </div>
            )}

            {tab === "submission" && (
              <div className="worktrace-internal-scroll h-full overflow-y-auto p-6">
                <div className="max-w-2xl">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#8C8C92] mb-3"><span className="h-px w-4 bg-[#D7FF3F]" />Final solution</div>
                <h3 className="text-lg mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Document your recommended fix.</h3>
                <p className="text-sm text-[#8C8C92] mb-5 leading-relaxed">State the solution, then explain the evidence and verification behind it.</p>
                <textarea value={submission.solution} onChange={(event) => dispatch(setSubmissionField({ field: "solution", value: event.target.value }))} rows={5} placeholder="Describe the fix or investigation outcome you recommend…" className="w-full bg-[#131315] border border-[#232326] rounded-md px-4 py-3 text-sm placeholder:text-[#5a5a5e] focus:outline-none focus:border-[#D7FF3F]/50 resize-none" />
                <textarea value={submission.justification} onChange={(event) => dispatch(setSubmissionField({ field: "justification", value: event.target.value }))} rows={5} placeholder="Explain why the evidence supports this decision…" className="mt-3 w-full bg-[#131315] border border-[#232326] rounded-md px-4 py-3 text-sm placeholder:text-[#5a5a5e] focus:outline-none focus:border-[#D7FF3F]/50 resize-none" />
                {recoverableError && <p role="alert" className="mt-3 text-sm text-[#FF6A57]">{recoverableError}</p>}
                <button disabled={loading.submitSolution || !submission.solution.trim() || !submission.justification.trim()} onClick={submitFinalSolution} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-md bg-[#D7FF3F] text-black text-sm font-medium hover:bg-white transition-colors disabled:opacity-60">{loading.submitSolution ? "Submitting…" : "Submit as Final Solution"}<ArrowRight size={14} /></button>
                </div>
              </div>
            )}

            {tab === "followup" && (
              <div className="worktrace-internal-scroll h-full overflow-y-auto p-6">
                <div className="max-w-2xl">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#8C8C92] mb-3">
                  <span className="h-px w-4 bg-[#D7FF3F]" />
                  Follow-up Question
                </div>
                <h3 className="text-lg mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Explain your reasoning independently.
                </h3>
                <p className="text-sm text-[#8C8C92] mb-5 leading-relaxed">
                  {followUp.question || "Why did you reach this conclusion? What evidence influenced your decision, what did you accept or reject from the AI teammate, and how did you verify it?"}
                </p>

                {!hasSubmittedFollowUp ? (
                  <>
                    <textarea
                      value={followUp.answer}
                      onChange={(e) => dispatch(setFollowUpAnswer(e.target.value))}
                      disabled={loading.submitFollowUp}
                      rows={5}
                      placeholder="The issue is caused by X because the evidence shows Y. I rejected the alternative because Z…"
                      className="w-full bg-[#131315] border border-[#232326] rounded-md px-4 py-3 text-sm placeholder:text-[#5a5a5e] focus:outline-none focus:border-[#D7FF3F]/50 resize-none"
                    />
                    <button disabled={loading.submitFollowUp || !followUp.answer.trim()} onClick={submitFollowup} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-md bg-[#D7FF3F] text-black text-sm font-medium hover:bg-white transition-colors disabled:opacity-60">
                      {loading.submitFollowUp ? "Submitting…" : "Submit Answer"}
                      <ArrowRight size={14} />
                    </button>
                  </>
                ) : (
                  <div className="rounded-lg border border-[#D7FF3F]/25 bg-[#D7FF3F]/[0.05] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AttributionTag who="learner" />
                      <span className="text-[11px] text-[#59E8A6]">independent_explanation</span>
                    </div>
                      <p className="text-sm text-[#EDEDEE]/90 leading-relaxed">{followUp.submittedAnswer}</p>
                  </div>
                )}

                {isEvaluating && (
                  <div className="mt-8 flex items-center gap-3 text-sm text-[#8C8C92]">
                    <Loader2 size={16} className="animate-spin text-[#D7FF3F]" />
                    The evaluator is grounding your Competency Receipt in this evidence timeline.
                  </div>
                )}
                </div>
              </div>
            )}
          </div>

          {tab !== "followup" && tab !== "submission" && (
            <div className="shrink-0 border-t border-[#1c1c1e] p-4 flex items-center gap-3">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addNote();
                  }
                }}
                disabled={loading.sendChat}
                aria-busy={loading.sendChat}
                placeholder={loading.sendChat ? "Thinking…" : "Add an investigation note or ask the AI teammate…"}
                className="flex-1 bg-[#131315] border border-[#232326] rounded-md px-4 py-2.5 text-sm placeholder:text-[#5a5a5e] focus:outline-none focus:border-[#D7FF3F]/50 disabled:cursor-wait disabled:opacity-60"
              />
              <button
                type="button"
                onClick={addNote}
                disabled={loading.sendChat || !note.trim()}
                aria-label={loading.sendChat ? "AI teammate is thinking" : "Send investigation note"}
                className="w-10 h-10 rounded-md bg-[#D7FF3F] text-black flex items-center justify-center hover:bg-white transition-colors shrink-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading.sendChat ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
          )}
        </motion.main>

        <motion.aside
          initial={{ x: 24, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="worktrace-internal-scroll hidden lg:flex flex-col bg-[#0F0F10] overflow-y-auto"
        >
          <div className="p-5 border-b border-[#1c1c1e]">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#8C8C92] mb-3">
              <span className="h-px w-4 bg-[#7FB2FF]" />
              AI Proposes · You Decide
            </div>

            <AnimatePresence mode="wait">
              {pendingSuggestion ? (
                <motion.div key="pending" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="rounded-lg border border-[#7FB2FF]/25 bg-[#7FB2FF]/[0.05] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Bot size={14} className="text-[#7FB2FF]" />
                    <span className="text-xs text-[#7FB2FF]">AI suggestion</span>
                  </div>
                  <p className="text-sm text-[#EDEDEE]/90 leading-relaxed mb-4">{pendingSuggestion.body}</p>
                  <p className="text-[11px] text-[#8C8C92] mb-4 flex items-start gap-1.5">
                    <Sparkles size={12} className="mt-0.5 shrink-0 text-[#8C8C92]" />
                    AI output is context. Your decision is the competency evidence.
                  </p>

                  {!independentOpen ? (
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <motion.button whileTap={{ scale: 0.96 }} onClick={() => resolveSuggestion("accepted")} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-[#59E8A6] text-black text-sm font-medium hover:bg-[#7CFFB2] transition-colors">
                        <Check size={14} />
                        Accept
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.96 }} onClick={() => resolveSuggestion("rejected")} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-[#FF6A57]/40 text-[#FF6A57] text-sm font-medium hover:bg-[#FF6A57]/10 transition-colors">
                        <X size={14} />
                        Reject
                      </motion.button>
                      <button onClick={() => setIndependentOpen(true)} className="col-span-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-[#232326] text-[#EDEDEE]/80 text-sm hover:border-[#D7FF3F]/40 hover:text-[#D7FF3F] transition-colors">
                        <ScaleIcon size={14} />
                        Decide independently
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        value={independentText}
                        onChange={(e) => setIndependentText(e.target.value)}
                        rows={3}
                        placeholder="The evidence is insufficient to apply the suggested fix because…"
                        className="w-full bg-[#0A0A0B] border border-[#232326] rounded-md px-3 py-2 text-xs placeholder:text-[#5a5a5e] focus:outline-none focus:border-[#D7FF3F]/50 resize-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => resolveSuggestion("independent", independentText)} className="flex-1 px-3 py-2 rounded-md bg-[#D7FF3F] text-black text-xs font-medium hover:bg-white transition-colors">
                          Use as Decision Rationale
                        </button>
                        <button onClick={() => setIndependentOpen(false)} className="px-3 py-2 rounded-md border border-[#232326] text-xs text-[#8C8C92] hover:text-[#EDEDEE] transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : suggestionDecision && verification.status !== "completed" ? (
                <motion.div key="verify" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="rounded-lg border border-[#59E8A6]/25 bg-[#59E8A6]/[0.05] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FlaskConical size={14} className="text-[#59E8A6]" />
                    <span className="text-xs text-[#59E8A6]">Verify your decision</span>
                  </div>
                  <p className="text-sm text-[#EDEDEE]/90 leading-relaxed mb-3">Confirm what you checked before treating this as resolved.</p>
                  <textarea
                    value={verification.rationale}
                    onChange={(e) => dispatch(setVerificationRationale(e.target.value))}
                    rows={3}
                    placeholder="Verified the proposed change against the checkout retry path…"
                    className="w-full bg-[#0A0A0B] border border-[#232326] rounded-md px-3 py-2 text-xs placeholder:text-[#5a5a5e] focus:outline-none focus:border-[#59E8A6]/50 resize-none mb-3"
                  />
                  <button onClick={recordVerification} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-[#59E8A6] text-black text-sm font-medium hover:bg-[#7CFFB2] transition-colors">
                    <Check size={14} />
                    Record Verification
                  </button>
                </motion.div>
              ) : (
                <motion.div key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg border border-[#232326] bg-[#131315] p-4 text-sm text-[#8C8C92] flex items-center gap-2">
                  <ShieldCheck size={14} className="text-[#59E8A6]" />
                  No pending suggestions — verified and clear.
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="p-5 border-b border-[#1c1c1e]">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#8C8C92] mb-3">
              <span className="h-px w-4 bg-[#D7FF3F]" />
              Decision &amp; Verification Log
            </div>
            <div className="space-y-2">
              {decisionAndVerificationEvents.length === 0 ? (
                <div className="text-xs text-[#8C8C92]">
                  <p>No decisions or verifications recorded yet.</p>
                  <p className="mt-1 text-[#5A5A5E]">Your decisions and verification notes will appear here as you work.</p>
                </div>
              ) : decisionAndVerificationEvents.map((e) => (
                  <motion.div key={e.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2 text-xs text-[#EDEDEE]/80 bg-[#131315] border border-[#232326] rounded-md px-3 py-2">
                    {e.eventType === "suggestion_verified" ? <FlaskConical size={12} className="text-[#59E8A6] mt-0.5 shrink-0" /> : <ScaleIcon size={12} className="text-[#D7FF3F] mt-0.5 shrink-0" />}
                    {e.body}
                  </motion.div>
                ))}
            </div>
          </div>

          <div className="mt-auto p-5">
            <div className="flex items-center gap-2 text-xs text-[#8C8C92] mb-4">
              <ClipboardList size={13} />
              Competency Signals
            </div>
            <div className="space-y-3">
              {competencyCopy.map((c) => {
                const met = competencyMet[c.label];
                return (
                  <div key={c.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[#EDEDEE]/70">
                        <span className="text-[#5a5a5e] mr-1.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{c.n}</span>
                        {c.label}
                      </span>
                    </div>
                    <div className={`flex items-start gap-1.5 text-[11px] ${met ? "text-[#59E8A6]" : "text-[#8C8C92]"}`}>
                      {met ? <Check size={11} className="mt-0.5 shrink-0" /> : <CircleDot size={11} className="mt-0.5 shrink-0" />}
                      <span><strong className="font-medium">{met ? "Complete" : "Incomplete"}</strong><br />{met ? c.metText : c.pendingText}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.aside>
      </div>

      {/* Deprecated local submit modal retained only as a source note during migration:
                This becomes a persisted, learner-owned evidence event — separate from the investigation evidence you collected along the way.
                placeholder="Re-validate the card on every retry attempt in backend/checkout.js, including the retry path…"
      */}

      <div className="lg:hidden shrink-0 border-t border-[#232326] bg-[#0F0F10] px-4 py-2 flex items-center justify-center gap-2 text-[11px] text-[#8C8C92]">
        <ChevronRight size={12} className="rotate-90" />
        Rotate or expand to see the full investigation workspace
      </div>
    </div>
  );
}

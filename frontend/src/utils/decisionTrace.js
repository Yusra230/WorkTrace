function eventFor(timeline, types) {
  return timeline.find((event) => types.includes(event.type));
}

function eventsFor(timeline, types) {
  return timeline.filter((event) => types.includes(event.type));
}

export function traceEventReference(event) {
  if (!event) return null;
  return `Event #${event.sequence}${event.event_id ? ` · ${event.event_id}` : ''}`;
}

export function traceEventSummary(event, key) {
  return event?.data?.[key] || null;
}

export function buildWorkspaceTrace({ chatTranscript, evidenceItems, offeredSuggestion, suggestionDecision, verificationStatus }) {
  const persistedEvidence = evidenceItems.filter((item) => item.persistenceStatus === 'persisted').length;
  const stages = {
    investigation: chatTranscript.length > 0,
    evidence: persistedEvidence > 0,
    hypothesis: Boolean(offeredSuggestion),
    decision: Boolean(suggestionDecision),
    verification: verificationStatus === 'completed'
  };
  const completeStages = Object.values(stages).filter(Boolean).length;
  const activeStage = !stages.investigation ? 'investigation' : !stages.evidence ? 'evidence' : !stages.hypothesis ? 'hypothesis' : !stages.decision ? 'decision' : !stages.verification ? 'verification' : 'proposal';

  return { activeStage, completeStages, persistedEvidence, stages: { ...stages, proposal: stages.verification } };
}

export function normalizeReceiptTrace(timeline = []) {
  const orderedTimeline = [...timeline].sort((a, b) => a.sequence - b.sequence);
  const investigation = eventFor(orderedTimeline, ['user_prompt']);
  const evidence = eventsFor(orderedTimeline, ['evidence_collected']);
  const hypothesis = eventFor(orderedTimeline, ['suggestion_offered']);
  const decision = eventFor(orderedTimeline, ['suggestion_rejected', 'suggestion_accepted']);
  const verification = eventFor(orderedTimeline, ['suggestion_verified']);
  const solution = eventFor(orderedTimeline, ['submission']);
  const explanation = eventFor(orderedTimeline, ['follow_up_answer']);
  const receipt = eventFor(orderedTimeline, ['evaluation_completed']);
  const completeKeys = new Set([
    investigation && 'investigation', evidence.length > 0 && 'evidence', hypothesis && 'hypothesis', decision && 'decision', verification && 'verification', solution && 'solution', explanation && 'explanation', receipt && 'receipt'
  ].filter(Boolean));

  return {
    completeKeys,
    decision,
    evidence,
    explanation,
    hypothesis,
    investigation,
    isVerifiedRejection: decision?.type === 'suggestion_rejected' && Boolean(verification),
    pivotalDecision: decision ? decision.type === 'suggestion_rejected' ? 'Rejected' : 'Accepted' : null,
    receipt,
    solution,
    verification
  };
}

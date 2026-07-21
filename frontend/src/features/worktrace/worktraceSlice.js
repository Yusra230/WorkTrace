import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getApiErrorMessage } from '../../services/apiClient';
import { saveCompletedSessionId } from '../../services/receiptStorage';
import { generateReceipt as generateReceiptRequest, getReceipt as getReceiptRequest, logEvent as logEventRequest, sendChat as sendChatRequest, startSession as startSessionRequest, submitFollowUp as submitFollowUpRequest, submitSolution as submitSolutionRequest } from '../../services/worktraceApi';

export const applicationViews = Object.freeze({
  ONBOARDING: 'onboarding',
  WORKSPACE: 'workspace',
  SUBMISSION: 'submission',
  FOLLOW_UP: 'follow-up',
  EVALUATING: 'evaluating',
  RECEIPT: 'receipt'
});

export const startSession = createAsyncThunk(
  'worktrace/startSession',
  async (_, { rejectWithValue }) => {
    try {
      return await startSessionRequest();
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error));
    }
  }
);

export const sendChat = createAsyncThunk(
  'worktrace/sendChat',
  async (message, { getState, rejectWithValue }) => {
    const sessionId = getState().worktrace.sessionId;
    if (!sessionId) return rejectWithValue('Start a mission before messaging your AI teammate.');

    try {
      const response = await sendChatRequest({ sessionId, message });
      return { message, response };
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error));
    }
  },
  {
    condition: (_, { getState }) => !getState().worktrace.loading.sendChat
  }
);

export const recordSuggestionDecision = createAsyncThunk(
  'worktrace/recordSuggestionDecision',
  async (decision, { getState, rejectWithValue }) => {
    const { sessionId, suggestionId, verification } = getState().worktrace;
    if (!sessionId || !suggestionId) return rejectWithValue('No AI hypothesis is available to record.');

    try {
      const data = { suggestion_id: suggestionId };
      if (verification.rationale.trim()) data.reason = verification.rationale.trim();
      const response = await logEventRequest({
        sessionId,
        type: decision === 'accepted' ? 'suggestion_accepted' : 'suggestion_rejected',
        data
      });
      return { decision, response };
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error));
    }
  }
);

export const verifySuggestionDecision = createAsyncThunk(
  'worktrace/verifySuggestionDecision',
  async (_, { getState, rejectWithValue }) => {
    const { sessionId, suggestionId, suggestionDecision, verification } = getState().worktrace;
    if (!sessionId || !suggestionId || !suggestionDecision) {
      return rejectWithValue('Record an AI hypothesis decision before verification.');
    }

    try {
      const data = {
        suggestion_id: suggestionId,
        decision: suggestionDecision
      };
      if (verification.rationale.trim()) data.reason = verification.rationale.trim();
      const response = await logEventRequest({ sessionId, type: 'suggestion_verified', data });
      return response;
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error));
    }
  }
);

export const submitSolution = createAsyncThunk(
  'worktrace/submitSolution',
  async (_, { getState, rejectWithValue }) => {
    const { sessionId, submission } = getState().worktrace;
    if (!sessionId) return rejectWithValue('Start a mission before submitting a solution.');
    if (!submission.solution.trim() || !submission.justification.trim()) {
      return rejectWithValue('Add both a proposed solution and its justification.');
    }

    try {
      return await submitSolutionRequest({
        sessionId,
        solution: submission.solution.trim(),
        justification: submission.justification.trim()
      });
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error));
    }
  }
);

export const submitFollowUp = createAsyncThunk(
  'worktrace/submitFollowUp',
  async (_, { getState, rejectWithValue }) => {
    const { followUp, sessionId } = getState().worktrace;
    if (!sessionId) return rejectWithValue('Start a mission before submitting an explanation.');
    if (!followUp.answer.trim()) return rejectWithValue('Add your independent explanation before continuing.');

    try {
      const response = await submitFollowUpRequest({ sessionId, answer: followUp.answer.trim() });
      if (!response.ready_for_evaluation) return rejectWithValue('Your explanation was saved, but evaluation is not ready yet.');
      return { ...response, answer: followUp.answer.trim() };
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error));
    }
  },
  {
    condition: (_, { getState }) => {
      const { followUp, loading } = getState().worktrace;
      return !loading.submitFollowUp && !followUp.submittedAnswer && Boolean(followUp.answer.trim());
    }
  }
);

export const generateReceipt = createAsyncThunk(
  'worktrace/generateReceipt',
  async (_, { getState, rejectWithValue }) => {
    const sessionId = getState().worktrace.sessionId;
    if (!sessionId) return rejectWithValue('No completed mission is available for evaluation.');

    try {
      const receipt = await generateReceiptRequest({ sessionId });
      saveCompletedSessionId(sessionId);
      return receipt;
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error));
    }
  }
);

export const restoreReceipt = createAsyncThunk(
  'worktrace/restoreReceipt',
  async (sessionId, { rejectWithValue }) => {
    try {
      return await getReceiptRequest({ sessionId });
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error));
    }
  }
);

function normalizedEvidenceField(value) {
  return String(value || '').trim().toLowerCase();
}

export function isDuplicateEvidence(items, evidence) {
  return items.some((item) => (
    item.id !== evidence.id
    && normalizedEvidenceField(item.title) === normalizedEvidenceField(evidence.title)
    && normalizedEvidenceField(item.description) === normalizedEvidenceField(evidence.description)
    && item.source === evidence.source
    && item.type === evidence.type
    && item.relation === evidence.relation
    && item.linkedHypothesisId === (evidence.linkedHypothesisId || null)
    && item.createdBy === evidence.createdBy
  ));
}

function isPersistedEvidenceId(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const persistEvidence = createAsyncThunk(
  'worktrace/persistEvidence',
  async (evidence, { getState, rejectWithValue }) => {
    const { evidenceItems, sessionId } = getState().worktrace;
    if (!sessionId) return rejectWithValue('Evidence could not be saved because the active mission is unavailable.');
    if (isDuplicateEvidence(evidenceItems, evidence)) return rejectWithValue('This evidence is already on the board.');

    try {
      const response = await logEventRequest({
        sessionId,
        type: 'evidence_collected',
        data: {
          title: evidence.title,
          description: evidence.description,
          source: evidence.source,
          type: evidence.type,
          relation: evidence.relation,
          linked_hypothesis_id: evidence.linkedHypothesisId,
          created_by: evidence.createdBy
        }
      });
      if (!isPersistedEvidenceId(response.evidence_id)) {
        return rejectWithValue('Evidence could not be saved because the server did not return a valid evidence ID.');
      }
      return { evidence: { ...evidence, id: response.evidence_id }, eventId: response.event_id };
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error));
    }
  }
);

export const collectEvidence = (evidence) => (dispatch, getState) => {
  const items = getState().worktrace.evidenceItems;
  if (isDuplicateEvidence(items, evidence)) {
    dispatch(setEvidenceError('This evidence is already on the board.'));
    return Promise.resolve({ duplicate: true });
  }
  return dispatch(persistEvidence(evidence));
};

export const initialState = {
  sessionId: null,
  mission: null,
  currentView: applicationViews.ONBOARDING,
  selectedFilePath: 'frontend/Checkout.js',
  chatTranscript: [],
  evidenceItems: [],
  evidenceError: null,
  offeredSuggestion: null,
  suggestionId: null,
  suggestionDecision: null,
  verification: {
    status: 'idle',
    rationale: ''
  },
  submission: {
    solution: '',
    justification: ''
  },
  followUp: {
    question: '',
    answer: '',
    submittedAnswer: ''
  },
  evaluation: {
    status: 'idle',
    attempts: 0
  },
  competencyReceipt: null,
  receiptRestoration: {
    status: 'idle'
  },
  loading: {
    startSession: false,
    sendChat: false,
    persistEvidence: false,
    logDecision: false,
    submitSolution: false,
    submitFollowUp: false,
    generateReceipt: false,
    verifyDecision: false
  },
  recoverableError: null,
  errorScope: null
};

const worktraceSlice = createSlice({
  name: 'worktrace',
  initialState,
  reducers: {
    clearRecoverableError(state) {
      state.recoverableError = null;
      state.errorScope = null;
    },
    hydrateActiveSession(state, action) {
      const snapshot = action.payload;
      state.sessionId = snapshot.sessionId;
      state.mission = snapshot.mission;
      state.currentView = snapshot.currentView;
      state.selectedFilePath = snapshot.selectedFilePath || initialState.selectedFilePath;
      state.chatTranscript = snapshot.chatTranscript || [];
      state.evidenceItems = snapshot.evidenceItems || [];
      state.offeredSuggestion = snapshot.offeredSuggestion || null;
      state.suggestionId = snapshot.suggestionId || null;
      state.suggestionDecision = snapshot.suggestionDecision || null;
      state.verification = snapshot.verification || initialState.verification;
      state.submission = snapshot.submission || initialState.submission;
      const restoredFollowUp = snapshot.followUp || initialState.followUp;
      const hadCompletedFollowUp = ['ready', 'generating', 'completed'].includes(snapshot.evaluation?.status)
        || snapshot.currentView === applicationViews.EVALUATING;
      state.followUp = {
        question: restoredFollowUp.question || '',
        answer: restoredFollowUp.answer || '',
        submittedAnswer: restoredFollowUp.submittedAnswer || (hadCompletedFollowUp ? restoredFollowUp.answer || '' : '')
      };
      state.evaluation = snapshot.evaluation || initialState.evaluation;
      state.competencyReceipt = null;
      state.receiptRestoration.status = 'not-found';
      state.loading = { ...initialState.loading };
      state.recoverableError = null;
      state.errorScope = null;
    },
    addEvidence(state, action) {
      const evidence = {
        id: action.payload.id,
        title: action.payload.title.trim(),
        description: action.payload.description.trim(),
        source: action.payload.source,
        type: action.payload.type,
        relation: action.payload.relation,
        linkedHypothesisId: action.payload.linkedHypothesisId || null,
        createdBy: action.payload.createdBy,
        persistenceStatus: action.payload.persistenceStatus || 'pending',
        eventId: action.payload.eventId || null
      };
      if (isDuplicateEvidence(state.evidenceItems, evidence)) {
        state.evidenceError = 'This evidence is already on the board.';
        return;
      }
      state.evidenceItems.push(evidence);
      state.evidenceError = null;
    },
    clearEvidenceError(state) {
      state.evidenceError = null;
    },
    setEvidenceError(state, action) {
      state.evidenceError = action.payload;
    },
    setCurrentView(state, action) {
      state.currentView = action.payload;
    },
    setSelectedFilePath(state, action) {
      state.selectedFilePath = action.payload;
    },
    setVerificationRationale(state, action) {
      state.verification.rationale = action.payload;
    },
    setSubmissionField(state, action) {
      const { field, value } = action.payload;
      state.submission[field] = value;
    },
    setFollowUpAnswer(state, action) {
      state.followUp.answer = action.payload;
    },
    markReceiptRestorationChecked(state) {
      state.receiptRestoration.status = 'not-found';
    },
    retryReceiptGeneration(state) {
      state.evaluation.status = 'ready';
      state.recoverableError = null;
      state.errorScope = null;
    },
    resetWorktrace() {
      return initialState;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(startSession.pending, (state) => {
        state.loading.startSession = true;
        state.recoverableError = null;
        state.errorScope = null;
      })
      .addCase(startSession.fulfilled, (state, action) => {
        state.loading.startSession = false;
        state.sessionId = action.payload.session_id;
        state.mission = action.payload.mission;
        state.currentView = applicationViews.WORKSPACE;
      })
      .addCase(startSession.rejected, (state, action) => {
        state.loading.startSession = false;
        state.recoverableError = action.payload || 'Unable to start a mission.';
        state.errorScope = 'session';
      })
      .addCase(sendChat.pending, (state, action) => {
        state.loading.sendChat = true;
        state.recoverableError = null;
        state.errorScope = null;
        state.chatTranscript.push({
          id: `learner-${action.meta.requestId}`,
          requestId: action.meta.requestId,
          role: 'learner',
          content: action.meta.arg,
          status: 'pending'
        });
      })
      .addCase(sendChat.fulfilled, (state, action) => {
        const { message, response } = action.payload;
        state.loading.sendChat = false;
        const pendingMessage = state.chatTranscript.find((item) => item.requestId === action.meta.requestId);
        if (pendingMessage) {
          pendingMessage.status = 'sent';
        } else {
          state.chatTranscript.push({ id: `learner-${action.meta.requestId}`, role: 'learner', content: message, status: 'sent' });
        }
        state.chatTranscript.push({ id: `teammate-${action.meta.requestId}`, role: 'teammate', content: response.ai_response, status: 'sent' });
        if (response.suggestion_offered && response.suggestion_id) {
          state.offeredSuggestion = { message: response.ai_response };
          state.suggestionId = response.suggestion_id;
        }
      })
      .addCase(sendChat.rejected, (state, action) => {
        state.loading.sendChat = false;
        const pendingMessage = state.chatTranscript.find((item) => item.requestId === action.meta.requestId);
        if (pendingMessage) pendingMessage.status = 'failed';
        state.recoverableError = action.payload || 'Unable to reach your AI teammate.';
        state.errorScope = 'chat';
      })
      .addCase(recordSuggestionDecision.pending, (state) => {
        state.loading.logDecision = true;
        state.recoverableError = null;
        state.errorScope = null;
      })
      .addCase(recordSuggestionDecision.fulfilled, (state, action) => {
        state.loading.logDecision = false;
        state.suggestionDecision = action.payload.decision;
        state.verification.status = 'decision-recorded';
      })
      .addCase(recordSuggestionDecision.rejected, (state, action) => {
        state.loading.logDecision = false;
        state.recoverableError = action.payload || 'Unable to record your decision.';
        state.errorScope = 'decision';
      })
      .addCase(verifySuggestionDecision.pending, (state) => {
        state.loading.verifyDecision = true;
        state.recoverableError = null;
        state.errorScope = null;
      })
      .addCase(verifySuggestionDecision.fulfilled, (state) => {
        state.loading.verifyDecision = false;
        state.verification.status = 'completed';
      })
      .addCase(verifySuggestionDecision.rejected, (state, action) => {
        state.loading.verifyDecision = false;
        state.recoverableError = action.payload || 'Unable to verify your decision.';
        state.errorScope = 'decision';
      })
      .addCase(submitSolution.pending, (state) => {
        state.loading.submitSolution = true;
        state.recoverableError = null;
        state.errorScope = null;
      })
      .addCase(submitSolution.fulfilled, (state, action) => {
        state.loading.submitSolution = false;
        state.followUp = { question: action.payload.follow_up_question, answer: '', submittedAnswer: '' };
        state.currentView = applicationViews.FOLLOW_UP;
      })
      .addCase(submitSolution.rejected, (state, action) => {
        state.loading.submitSolution = false;
        state.recoverableError = action.payload || 'Unable to submit your proposal.';
        state.errorScope = 'submission';
      })
      .addCase(submitFollowUp.pending, (state) => {
        state.loading.submitFollowUp = true;
        state.recoverableError = null;
        state.errorScope = null;
      })
      .addCase(submitFollowUp.fulfilled, (state, action) => {
        state.loading.submitFollowUp = false;
        state.followUp.submittedAnswer = action.payload.answer || state.followUp.answer.trim();
        state.followUp.answer = '';
        state.evaluation.status = 'ready';
        state.currentView = applicationViews.EVALUATING;
      })
      .addCase(submitFollowUp.rejected, (state, action) => {
        state.loading.submitFollowUp = false;
        state.recoverableError = action.payload || 'Unable to submit your explanation.';
        state.errorScope = 'follow-up';
      })
      .addCase(generateReceipt.pending, (state) => {
        state.loading.generateReceipt = true;
        state.evaluation.status = 'generating';
        state.evaluation.attempts += 1;
        state.recoverableError = null;
        state.errorScope = null;
      })
      .addCase(generateReceipt.fulfilled, (state, action) => {
        state.loading.generateReceipt = false;
        state.evaluation.status = 'completed';
        state.competencyReceipt = action.payload;
        state.currentView = applicationViews.RECEIPT;
      })
      .addCase(generateReceipt.rejected, (state, action) => {
        state.loading.generateReceipt = false;
        state.evaluation.status = 'error';
        state.recoverableError = action.payload || 'Unable to generate your Competency Receipt.';
        state.errorScope = 'receipt';
      })
      .addCase(restoreReceipt.pending, (state) => {
        state.receiptRestoration.status = 'loading';
      })
      .addCase(restoreReceipt.fulfilled, (state, action) => {
        state.receiptRestoration.status = 'loaded';
        state.sessionId = action.payload.session_id || action.meta.arg;
        state.competencyReceipt = action.payload;
        state.evaluation.status = 'completed';
        state.currentView = applicationViews.RECEIPT;
      })
      .addCase(restoreReceipt.rejected, (state, action) => {
        state.receiptRestoration.status = 'error';
        state.recoverableError = action.payload || 'Unable to restore your Competency Receipt.';
        state.errorScope = 'receipt';
      })
      .addCase(persistEvidence.pending, (state, action) => {
        state.loading.persistEvidence = true;
        state.evidenceError = null;
      })
      .addCase(persistEvidence.fulfilled, (state, action) => {
        state.loading.persistEvidence = false;
        const evidence = {
          ...action.payload.evidence,
          persistenceStatus: 'persisted',
          eventId: action.payload.eventId
        };
        if (!isDuplicateEvidence(state.evidenceItems, evidence)) {
          state.evidenceItems.push(evidence);
        }
        state.evidenceError = null;
      })
      .addCase(persistEvidence.rejected, (state, action) => {
        state.loading.persistEvidence = false;
        state.evidenceError = action.payload || 'Unable to save evidence to the mission timeline.';
        state.recoverableError = state.evidenceError;
        state.errorScope = 'evidence';
      });
  }
});

export const { addEvidence, clearEvidenceError, clearRecoverableError, hydrateActiveSession, markReceiptRestorationChecked, resetWorktrace, retryReceiptGeneration, setCurrentView, setEvidenceError, setFollowUpAnswer, setSelectedFilePath, setSubmissionField, setVerificationRationale } = worktraceSlice.actions;
export default worktraceSlice.reducer;

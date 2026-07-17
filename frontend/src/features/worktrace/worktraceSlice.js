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
      return response;
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error));
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

export const initialState = {
  sessionId: null,
  mission: null,
  currentView: applicationViews.ONBOARDING,
  selectedFilePath: 'frontend/Checkout.js',
  chatTranscript: [],
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
    answer: ''
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
      .addCase(sendChat.pending, (state) => {
        state.loading.sendChat = true;
        state.recoverableError = null;
        state.errorScope = null;
      })
      .addCase(sendChat.fulfilled, (state, action) => {
        const { message, response } = action.payload;
        const messageNumber = state.chatTranscript.length + 1;
        state.loading.sendChat = false;
        state.chatTranscript.push(
          { id: `learner-${messageNumber}`, role: 'learner', content: message },
          { id: `teammate-${messageNumber + 1}`, role: 'teammate', content: response.ai_response }
        );
        if (response.suggestion_offered && response.suggestion_id) {
          state.offeredSuggestion = { message: response.ai_response };
          state.suggestionId = response.suggestion_id;
        }
      })
      .addCase(sendChat.rejected, (state, action) => {
        state.loading.sendChat = false;
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
        state.followUp.question = action.payload.follow_up_question;
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
      .addCase(submitFollowUp.fulfilled, (state) => {
        state.loading.submitFollowUp = false;
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
      });
  }
});

export const { clearRecoverableError, markReceiptRestorationChecked, resetWorktrace, retryReceiptGeneration, setCurrentView, setFollowUpAnswer, setSelectedFilePath, setSubmissionField, setVerificationRationale } = worktraceSlice.actions;
export default worktraceSlice.reducer;

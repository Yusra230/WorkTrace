import apiClient from './apiClient';

export async function startSession() {
  const response = await apiClient.post('/session/start', {});
  return response.data;
}

export async function getMissionPreview() {
  const response = await apiClient.get('/session/mission');
  return response.data.mission;
}

export async function sendChat({ sessionId, message }) {
  const response = await apiClient.post('/chat', {
    session_id: sessionId,
    message
  });
  return response.data;
}

export async function logEvent({ sessionId, type, data }) {
  const response = await apiClient.post('/event/log', {
    session_id: sessionId,
    type,
    data
  });
  return response.data;
}

export async function submitSolution({ sessionId, solution, justification }) {
  const response = await apiClient.post('/submission', {
    session_id: sessionId,
    solution,
    justification
  });
  return response.data;
}

export async function submitFollowUp({ sessionId, answer }) {
  const response = await apiClient.post('/submission/follow-up', {
    session_id: sessionId,
    answer
  });
  return response.data;
}

export async function generateReceipt({ sessionId }) {
  const response = await apiClient.post('/receipt/generate', {
    session_id: sessionId
  });
  return response.data;
}

export async function getReceipt({ sessionId }) {
  const response = await apiClient.get(`/receipt/${encodeURIComponent(sessionId)}`);
  return response.data;
}

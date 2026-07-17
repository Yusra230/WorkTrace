const SENSITIVE_TEXT_PATTERNS = [
  /sk-(?:proj-)?[A-Za-z0-9_-]{8,}/gi,
  /(authorization\s*:\s*bearer\s+)[^\s"']+/gi,
  /(bearer\s+)[A-Za-z0-9._-]{12,}/gi
];

const INTERNAL_PROMPT_MARKERS = [
  'you are an ai teammate helping a junior product engineer at novacommerce',
  'you are an evaluator analyzing a learner\'s performance in an ai-assisted software engineering workplace simulation'
];

function redactSensitiveText(value) {
  if (typeof value !== 'string') return value;
  let safe = value;
  for (const pattern of SENSITIVE_TEXT_PATTERNS) {
    safe = safe.replace(pattern, (match, prefix) => prefix ? `${prefix}[REDACTED]` : '[REDACTED]');
  }
  if (INTERNAL_PROMPT_MARKERS.some((marker) => safe.toLowerCase().includes(marker))) {
    return '[Internal content removed.]';
  }
  return safe;
}

module.exports = { redactSensitiveText };

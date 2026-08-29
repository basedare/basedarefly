export function sanitizeInboxMessageBody(value: string) {
  let body = value.replace(/\s+/g, ' ').trim();
  let redacted = false;

  const replacements: Array<[RegExp, string]> = [
    [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[blocked email]'],
    [/(?:\+?\d[\d\s().-]{7,}\d)/g, '[blocked phone]'],
    [/\b(?:https?:\/\/)?(?:t\.me|telegram\.me|wa\.me)\/[^\s]+/gi, '[blocked contact link]'],
  ];

  for (const [pattern, replacement] of replacements) {
    if (pattern.test(body)) {
      redacted = true;
      body = body.replace(pattern, replacement);
    }
  }

  return {
    body: body.slice(0, 1000),
    redacted,
  };
}

export function isInboxMessageOnlyBlockedContact(body: string) {
  return !body || body === '[blocked email]' || body === '[blocked phone]';
}

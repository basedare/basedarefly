type InboxErrorPayload = {
  status: number;
  body: {
    success: false;
    error: string;
    code?: string;
  };
};

function getErrorCode(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code ?? '')
    : '';
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '';
}

export function getInboxApiError(error: unknown, fallback: string): InboxErrorPayload {
  const code = getErrorCode(error);
  const message = getErrorMessage(error);
  const lowerMessage = message.toLowerCase();
  const schemaMissing =
    code === 'P2021' ||
    code === 'P2022' ||
    (lowerMessage.includes('inboxthread') && lowerMessage.includes('does not exist')) ||
    (lowerMessage.includes('inboxmessage') && lowerMessage.includes('does not exist'));

  if (schemaMissing) {
    return {
      status: 503,
      body: {
        success: false,
        error: 'Inbox database is not ready yet. Apply the inbox migration in Supabase, then refresh.',
        code: 'INBOX_SCHEMA_MISSING',
      },
    };
  }

  return {
    status: 500,
    body: {
      success: false,
      error: fallback,
    },
  };
}

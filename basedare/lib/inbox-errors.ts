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
    (lowerMessage.includes('inboxmessage') && lowerMessage.includes('does not exist')) ||
    (lowerMessage.includes('relation') && lowerMessage.includes('inboxthread')) ||
    (lowerMessage.includes('relation') && lowerMessage.includes('inboxmessage')) ||
    (lowerMessage.includes('column') && lowerMessage.includes('inboxthread')) ||
    (lowerMessage.includes('column') && lowerMessage.includes('inboxmessage'));

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

  const permissionBlocked =
    lowerMessage.includes('permission denied') &&
    (lowerMessage.includes('inboxthread') || lowerMessage.includes('inboxmessage'));

  if (permissionBlocked) {
    return {
      status: 503,
      body: {
        success: false,
        error: 'Inbox database permissions are blocking server access. Reapply the inbox RLS policy or use the server database connection.',
        code: 'INBOX_PERMISSION_BLOCKED',
      },
    };
  }

  const databaseUnavailable =
    code === 'P1000' ||
    code === 'P1001' ||
    code === 'P1002' ||
    code === 'P1017' ||
    lowerMessage.includes('can\'t reach database') ||
    lowerMessage.includes('connection terminated') ||
    lowerMessage.includes('connection refused');

  if (databaseUnavailable) {
    return {
      status: 503,
      body: {
        success: false,
        error: 'Inbox database connection failed. Check the production DATABASE_URL/Supabase connection, then refresh.',
        code: 'INBOX_DATABASE_UNAVAILABLE',
      },
    };
  }

  return {
    status: 500,
    body: {
      success: false,
      error: fallback,
      code: code || 'INBOX_QUERY_FAILED',
    },
  };
}

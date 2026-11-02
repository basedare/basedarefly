export const RETENTION_TOPICS = { challenges: 'Fresh free challenges', community: 'Community plans', creators: 'Creator opportunities' } as const;
export const RETENTION_CONSENT = 'next-dare-email-v1';
export type RetentionTopic = keyof typeof RETENTION_TOPICS;

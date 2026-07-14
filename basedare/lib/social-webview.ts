export type SocialWebviewClass =
  | 'instagram'
  | 'tiktok'
  | 'facebook'
  | 'messenger'
  | 'other-in-app'
  | 'browser';

export function classifySocialWebview(userAgent: string | null | undefined): SocialWebviewClass {
  const ua = userAgent?.trim() ?? '';
  if (!ua) return 'browser';
  if (/Instagram/i.test(ua)) return 'instagram';
  if (/TikTok|musical_ly|BytedanceWebview/i.test(ua)) return 'tiktok';
  if (/Messenger|FBAN\/MessengerForiOS/i.test(ua)) return 'messenger';
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'facebook';
  if (/; wv\)|\bwv\b|Line\//i.test(ua)) return 'other-in-app';
  return 'browser';
}

export function isSocialWebview(userAgent: string | null | undefined): boolean {
  return classifySocialWebview(userAgent) !== 'browser';
}

export function socialWebviewLabel(value: SocialWebviewClass): string {
  if (value === 'instagram') return 'Instagram';
  if (value === 'tiktok') return 'TikTok';
  if (value === 'facebook') return 'Facebook';
  if (value === 'messenger') return 'Messenger';
  if (value === 'other-in-app') return 'this in-app browser';
  return 'your browser';
}

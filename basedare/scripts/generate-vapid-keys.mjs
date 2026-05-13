#!/usr/bin/env node

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const webpush = require('web-push');

const keys = webpush.generateVAPIDKeys();
const subject = process.env.VAPID_SUBJECT || 'mailto:hello@basedare.xyz';

console.log(`# BaseDare browser push VAPID keys
# Keep VAPID_PRIVATE_KEY secret.
# VAPID_PUBLIC_KEY is safe to expose through /api/push/config.
VAPID_PUBLIC_KEY="${keys.publicKey}"
VAPID_PRIVATE_KEY="${keys.privateKey}"
VAPID_SUBJECT="${subject}"

# Optional legacy/build-time public key. Runtime push config no longer requires it.
NEXT_PUBLIC_VAPID_PUBLIC_KEY="${keys.publicKey}"`);

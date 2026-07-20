import { access } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  if (!specifier.startsWith('@/')) return nextResolve(specifier, context);
  const base = path.join(process.cwd(), specifier.slice(2));
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
    try {
      await access(candidate);
      return { url: pathToFileURL(candidate).href, shortCircuit: true };
    } catch {}
  }
  return nextResolve(specifier, context);
}

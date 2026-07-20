import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'server-only') {
    return {
      url: 'data:text/javascript,export default {}',
      shortCircuit: true,
    };
  }
  if (specifier.startsWith('next/') && !path.extname(specifier)) {
    const candidate = path.join(process.cwd(), 'node_modules', `${specifier}.js`);
    try {
      await access(candidate);
      return { url: pathToFileURL(candidate).href, shortCircuit: true };
    } catch {}
  }
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && !path.extname(specifier)) {
    const parentPath = context.parentURL?.startsWith('file:')
      ? path.dirname(fileURLToPath(context.parentURL))
      : process.cwd();
    const base = path.resolve(parentPath, specifier);
    for (const candidate of [`${base}.ts`, `${base}.tsx`, `${base}.js`, path.join(base, 'index.ts')]) {
      try {
        await access(candidate);
        return { url: pathToFileURL(candidate).href, shortCircuit: true };
      } catch {}
    }
  }
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

import { lstat, symlink } from 'node:fs/promises';
import path from 'node:path';

const cwd = process.cwd();

async function pathExists(filePath) {
  try {
    await lstat(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

async function ensureParentAlias(name, type = 'dir') {
  const parentPath = path.resolve(cwd, '..', name);
  const targetPath = path.resolve(cwd, name);

  if (!(await pathExists(targetPath))) {
    console.warn(`[prebuild] Skipped parent ${name} alias because ${path.relative(cwd, targetPath)} is missing`);
    return;
  }

  if (await pathExists(parentPath)) {
    return;
  }

  const relativeTarget = path.relative(path.dirname(parentPath), targetPath);
  try {
    await symlink(relativeTarget, parentPath, type);
    console.log(`[prebuild] Linked parent ${name} to ${relativeTarget} for Vercel output collection`);
  } catch (error) {
    console.warn(`[prebuild] Could not prepare parent ${name} alias for Vercel output collection`, error);
  }
}

const isVercelBuild =
  process.env.VERCEL === '1' ||
  Boolean(process.env.VERCEL_ENV) ||
  Boolean(process.env.NOW_BUILDER);
const isNestedAppRoot = path.basename(cwd) === 'basedare';

if (isVercelBuild && isNestedAppRoot) {
  await ensureParentAlias('.next');
  await ensureParentAlias('node_modules');
  await ensureParentAlias('config');
  await ensureParentAlias('.env.mainnet.example', 'file');
}

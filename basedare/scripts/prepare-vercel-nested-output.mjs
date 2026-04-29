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

async function ensureParentAlias(name) {
  const parentPath = path.resolve(cwd, '..', name);
  const targetPath = path.resolve(cwd, name);

  if (await pathExists(parentPath)) {
    return;
  }

  const relativeTarget = path.relative(path.dirname(parentPath), targetPath);
  await symlink(relativeTarget, parentPath, 'dir');
  console.log(`[prebuild] Linked parent ${name} to ${relativeTarget} for Vercel output collection`);
}

const isVercelBuild =
  process.env.VERCEL === '1' ||
  Boolean(process.env.VERCEL_ENV) ||
  Boolean(process.env.NOW_BUILDER);
const isNestedAppRoot = path.basename(cwd) === 'basedare';

if (isVercelBuild && isNestedAppRoot) {
  await ensureParentAlias('.next');
  await ensureParentAlias('node_modules');
}

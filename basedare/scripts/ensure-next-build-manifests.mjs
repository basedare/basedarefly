import { copyFile, lstat, stat, symlink } from 'node:fs/promises';
import path from 'node:path';

const nextDir = path.join(process.cwd(), '.next');
const routesManifestPath = path.join(nextDir, 'routes-manifest.json');
const deterministicRoutesManifestPath = path.join(nextDir, 'routes-manifest-deterministic.json');

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

async function ensureDeterministicRoutesManifest(targetNextDir = nextDir) {
  const sourcePath = path.join(targetNextDir, 'routes-manifest.json');
  const targetPath = path.join(targetNextDir, 'routes-manifest-deterministic.json');

  if ((await exists(sourcePath)) && !(await exists(targetPath))) {
    await copyFile(sourcePath, targetPath);
    console.log(`[postbuild] Created ${path.relative(process.cwd(), targetPath)} fallback`);
  }
}

async function ensureVercelParentNextAlias() {
  const isVercelBuild = process.env.VERCEL === '1' && Boolean(process.env.VERCEL_ENV);
  const isNestedAppRoot = path.basename(process.cwd()) === 'basedare';

  if (!isVercelBuild || !isNestedAppRoot) {
    return;
  }

  const parentNextDir = path.resolve(process.cwd(), '..', '.next');

  try {
    await lstat(parentNextDir);
    await ensureDeterministicRoutesManifest(parentNextDir);
    return;
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }

  const relativeTarget = path.relative(path.dirname(parentNextDir), nextDir);
  await symlink(relativeTarget, parentNextDir, 'dir');
  console.log(`[postbuild] Linked parent .next to ${relativeTarget} for Vercel output collection`);
}

await ensureDeterministicRoutesManifest();
await ensureVercelParentNextAlias();

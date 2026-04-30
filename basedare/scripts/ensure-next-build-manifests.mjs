import { copyFile, lstat, readdir, readFile, stat, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const nextDir = path.join(process.cwd(), '.next');
const routesManifestPath = path.join(nextDir, 'routes-manifest.json');
const deterministicRoutesManifestPath = path.join(nextDir, 'routes-manifest-deterministic.json');
const isVercelBuild =
  process.env.VERCEL === '1' ||
  Boolean(process.env.VERCEL_ENV) ||
  Boolean(process.env.NOW_BUILDER);
const isNestedAppRoot = path.basename(process.cwd()) === 'basedare';

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

function isInsidePath(childPath, parentPath) {
  const relativePath = path.relative(parentPath, childPath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

async function findTraceManifests(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const manifests = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      manifests.push(...(await findTraceManifests(entryPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.nft.json')) {
      manifests.push(entryPath);
    }
  }

  return manifests;
}

async function ensureVercelParentNextAlias() {
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
  try {
    await symlink(relativeTarget, parentNextDir, 'dir');
    console.log(`[postbuild] Linked parent .next to ${relativeTarget} for Vercel output collection`);
  } catch (error) {
    console.warn('[postbuild] Could not prepare parent .next alias for Vercel output collection', error);
  }
}

async function rewriteNestedVercelTraceManifests() {
  if (!isVercelBuild || !isNestedAppRoot || !(await exists(nextDir))) {
    return;
  }

  const parentNextDir = path.resolve(process.cwd(), '..', '.next');
  const manifests = await findTraceManifests(nextDir);
  let rewrittenFiles = 0;
  let rewrittenEntries = 0;

  for (const manifestPath of manifests) {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

    if (!Array.isArray(manifest.files)) {
      continue;
    }

    const relativeManifestPath = path.relative(nextDir, manifestPath);
    const parentManifestDir = path.dirname(path.join(parentNextDir, relativeManifestPath));
    const appManifestDir = path.dirname(manifestPath);
    let changed = false;

    manifest.files = manifest.files.map((filePath) => {
      if (typeof filePath !== 'string' || path.isAbsolute(filePath)) {
        return filePath;
      }

      const appTargetPath = path.resolve(appManifestDir, filePath);
      const parentTargetPath = path.resolve(parentManifestDir, filePath);

      if (isInsidePath(appTargetPath, process.cwd()) && !isInsidePath(parentTargetPath, process.cwd())) {
        changed = true;
        rewrittenEntries += 1;
        return toPosixPath(path.relative(parentManifestDir, appTargetPath));
      }

      return filePath;
    });

    if (changed) {
      await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`);
      rewrittenFiles += 1;
    }
  }

  if (rewrittenFiles > 0) {
    console.log(
      `[postbuild] Rewrote ${rewrittenEntries} trace paths across ${rewrittenFiles} manifests for Vercel parent output collection`,
    );
  }
}

await ensureDeterministicRoutesManifest();
await ensureVercelParentNextAlias();
await rewriteNestedVercelTraceManifests();

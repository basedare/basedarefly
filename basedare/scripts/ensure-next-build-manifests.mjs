import { copyFile, stat } from 'node:fs/promises';
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

if ((await exists(routesManifestPath)) && !(await exists(deterministicRoutesManifestPath))) {
  await copyFile(routesManifestPath, deterministicRoutesManifestPath);
  console.log('[postbuild] Created .next/routes-manifest-deterministic.json fallback');
}

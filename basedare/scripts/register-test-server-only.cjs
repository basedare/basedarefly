const Module = require('node:module');
const fs = require('node:fs');
const path = require('node:path');

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveTestAlias(request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    const basePath = path.join(process.cwd(), request.slice(2));
    const candidates = [
      basePath,
      `${basePath}.ts`,
      `${basePath}.tsx`,
      `${basePath}.js`,
      `${basePath}.cjs`,
      path.join(basePath, 'index.ts'),
      path.join(basePath, 'index.tsx'),
      path.join(basePath, 'index.js'),
    ];
    const resolvedPath = candidates.find((candidate) => fs.existsSync(candidate));
    if (resolvedPath) return resolvedPath;
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

const originalLoad = Module._load;
Module._load = function loadWithServerOnlyStub(request, parent, isMain) {
  if (request === 'server-only') return {};
  return originalLoad.call(this, request, parent, isMain);
};

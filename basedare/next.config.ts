import { existsSync, lstatSync, symlinkSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

const isVercelBuild =
  process.env.VERCEL === "1" ||
  Boolean(process.env.VERCEL_ENV) ||
  Boolean(process.env.NOW_BUILDER);
const appRoot = process.cwd();
const isNestedAppRoot = path.basename(appRoot) === "basedare";

function ensureVercelParentAlias(name: string, type: "dir" | "file" = "dir") {
  const parentPath = path.resolve(appRoot, "..", name);
  const targetPath = path.resolve(appRoot, name);

  try {
    if (lstatSync(parentPath, { throwIfNoEntry: false })) {
      return;
    }

    const relativeTarget = path.relative(path.dirname(parentPath), targetPath);
    symlinkSync(relativeTarget, parentPath, type);
    console.log(`[next-config] Linked parent ${name} to ${relativeTarget} for Vercel output collection`);
  } catch (error) {
    console.warn(`[next-config] Could not prepare parent ${name} alias for Vercel`, error);
  }
}

if (isVercelBuild && isNestedAppRoot) {
  ensureVercelParentAlias(".next");
  ensureVercelParentAlias("node_modules");
  ensureVercelParentAlias("config");
  ensureVercelParentAlias("prisma");
  ensureVercelParentAlias("package.json", "file");

  if (existsSync(path.join(appRoot, ".env.example"))) {
    ensureVercelParentAlias(".env.example", "file");
  }

  if (existsSync(path.join(appRoot, ".env.mainnet.example"))) {
    ensureVercelParentAlias(".env.mainnet.example", "file");
  }
}

const nextConfig: NextConfig = {
  turbopack: {},
  outputFileTracingRoot: appRoot,
  async redirects() {
    return [
      {
        source: '/streamers',
        destination: '/creators',
        permanent: true,
      },
      {
        source: '/captains',
        destination: '/hosts',
        permanent: true,
      },
      {
        // Pre-pivot bounty feed ("Degen Colosseum") — off the grid for good.
        source: '/dares',
        destination: '/board',
        permanent: true,
      },
      // Nav labels people type as URLs.
      {
        source: '/fund',
        destination: '/create',
        permanent: true,
      },
      {
        source: '/earn',
        destination: '/creators',
        permanent: true,
      },
      {
        source: '/passport',
        destination: '/dashboard',
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'qtrypzzcjebvfcihiynt.supabase.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    // Coinbase Smart Wallet opens keys.coinbase.com as a popup and talks back
    // through window.opener. Without an explicit COOP, that popup relationship
    // gets severed on iOS Safari — the "This app doesn't support smart wallets"
    // error. `same-origin-allow-popups` is Coinbase's documented fix and also
    // keeps OAuth (tag-claim) popups working.
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
        ],
      },
    ];
  },
  webpack: (config) => {
    // 1. Fix for "Module not found: Can't resolve 'fs', 'net', 'tls'"
    config.resolve = config.resolve ?? {};
    config.resolve.fallback = { 
      ...(config.resolve.fallback ?? {}),
      fs: false, 
      net: false, 
      tls: false 
    };

    // 2. Fix for "Can't resolve '@react-native-async-storage/async-storage'"
    // This tells Webpack to treat these imports as external (ignore them)
    const externals = Array.isArray(config.externals)
      ? config.externals
      : config.externals
        ? [config.externals]
        : [];

    externals.push({
      '@react-native-async-storage/async-storage': 'commonjs @react-native-async-storage/async-storage',
      'pino-pretty': 'commonjs pino-pretty',
      'lokijs': 'commonjs lokijs',
      'encoding': 'commonjs encoding',
    });
    config.externals = externals;

    return config;
  },
};

export default nextConfig;

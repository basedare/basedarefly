import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  outputFileTracingRoot: process.cwd(),
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

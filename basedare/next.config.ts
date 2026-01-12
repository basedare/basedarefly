/** @type {import('next').NextConfig} */
const nextConfig = {
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
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config: any) => {
    // 1. Fix for "Module not found: Can't resolve 'fs', 'net', 'tls'"
    config.resolve.fallback = { 
      fs: false, 
      net: false, 
      tls: false 
    };

    // 2. Fix for "Can't resolve '@react-native-async-storage/async-storage'"
    // This tells Webpack to treat these imports as external (ignore them)
    config.externals = config.externals || [];
    config.externals.push({
      '@react-native-async-storage/async-storage': 'commonjs @react-native-async-storage/async-storage',
      'pino-pretty': 'commonjs pino-pretty',
      'lokijs': 'commonjs lokijs',
      'encoding': 'commonjs encoding',
    });

    return config;
  },
};

module.exports = nextConfig;
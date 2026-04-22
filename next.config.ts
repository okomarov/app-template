import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@base-ui/react', '@tanstack/react-query'],
  },
}

export default nextConfig

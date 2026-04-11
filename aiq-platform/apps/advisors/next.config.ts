import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@aiq/db', '@aiq/config'],
  experimental: {
    serverComponentsExternalPackages: ['@anthropic-ai/sdk'],
  },
}

export default nextConfig

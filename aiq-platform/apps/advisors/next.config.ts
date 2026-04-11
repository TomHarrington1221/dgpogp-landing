import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@aiq/db', '@aiq/config'],
  serverExternalPackages: ['@anthropic-ai/sdk'],
}

export default nextConfig

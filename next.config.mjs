/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },

  // --- ADD THIS PROXY CONFIGURATION ---
  async rewrites() {
    return [
      // This rule will proxy requests like /api/count-tokens
      {
        source: '/api/:path*',
        // to the backend container's /api/... endpoint
        destination: 'http://backend:5000/api/:path*',
      },
      // This rule will proxy all other specific API routes
      {
        source: '/:path(analyze|batch_tokenize|compare_tokenizers|health)',
        // to the backend container's root endpoints
        destination: 'http://backend:5000/:path',
      },
    ]
  },
}

export default nextConfig
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
  // ADD THIS BLOCK to proxy API requests
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:5000/api/:path*',
      },
      // This will match all other endpoints on your Flask app
      {
        source: '/:path(analyze|batch_tokenize|compare_tokenizers|health)',
        destination: 'http://backend:5000/:path',
      },
    ]
  },
}

export default nextConfig
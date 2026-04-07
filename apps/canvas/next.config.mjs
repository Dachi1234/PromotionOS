/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  async headers() {
    const allowedAncestors = process.env.ALLOWED_FRAME_ANCESTORS || '*'
    return [
      {
        source: '/:slug',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: `frame-ancestors ${allowedAncestors}` },
        ],
      },
    ]
  },
}

export default nextConfig

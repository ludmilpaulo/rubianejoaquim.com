/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '', pathname: '/**' },
      { protocol: 'http', hostname: '127.0.0.1', port: '', pathname: '/**' },
      {
        protocol: 'https',
        hostname: 'ludmilpaulo.pythonanywhere.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig

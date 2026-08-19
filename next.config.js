/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pdfkit ships its own AFM font files as .afm; tell webpack to leave them alone at runtime
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({ 'pdfkit': 'commonjs pdfkit' });
    }
    return config;
  },
};
module.exports = nextConfig;

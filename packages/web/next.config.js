/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Shared TS types live in a sibling workspace; transpile them through webpack.
  transpilePackages: ['@predictx/shared'],
  // Allow importing the generated contract ABIs from packages/contracts/artifacts.
  experimental: {
    externalDir: true,
  },
  eslint: {
    // Lint is run separately in CI; don't fail production builds on lint.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;

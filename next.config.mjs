/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  webpack: (config) => {
    // Add this to handle binary files
    config.resolve.alias = {
      ...config.resolve.alias,
      "chrome-aws-lambda": "chrome-aws-lambda/lambda",
    };
    return config;
  },
};

export default nextConfig;

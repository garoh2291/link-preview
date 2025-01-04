/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        "@sparticuz/chromium",
        "chrome-aws-lambda",
      ];
    }
    return config;
  },
};

export default nextConfig;

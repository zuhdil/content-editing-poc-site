/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/content-editing-poc-site",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;

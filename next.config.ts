import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH,
};

export default nextConfig;

import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // В домашней папке есть посторонний package-lock.json — фиксируем корень проекта явно
  outputFileTracingRoot: path.resolve(__dirname),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "resources.cdn-kaspi.kz" },
      { protocol: "https", hostname: "**.cdn-kaspi.kz" },
    ],
  },
};

export default nextConfig;

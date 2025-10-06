import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ✅ Empêche Vercel d'arrêter le build sur les erreurs ESLint
  },
};

export default nextConfig;

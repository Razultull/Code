import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["rss-parser", "ws", "@stomp/stompjs"],
};

export default nextConfig;

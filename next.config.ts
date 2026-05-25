import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Разрешаем dev-доступ с локальной сети (мобильный, планшет, ноут учителя)
  allowedDevOrigins: ["192.168.0.0/16", "10.0.0.0/8", "172.16.0.0/12", "*.local"],
};

export default nextConfig;

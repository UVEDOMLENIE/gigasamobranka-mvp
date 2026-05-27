import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Разрешаем dev-доступ с текущего локального IP.
  // Если роутер выдаст другой адрес, поменяйте IP здесь и перезапустите dev-сервер.
  allowedDevOrigins: ["192.168.0.19", "localhost", "127.0.0.1", "*.local"],
};

export default nextConfig;

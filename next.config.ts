import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 모바일/태블릿에서 LAN IP(예: http://10.10.101.22:3001)로 접속할 때
  // Next dev 내부 리소스(_next/*, HMR 등)가 교차출처로 차단되지 않도록 허용한다.
  // 현재 IP + 사설망 대역(와일드카드)을 함께 등록해 IP가 바뀌어도 동작하게 한다.
  allowedDevOrigins: [
    "10.10.101.22",
    "10.10.*.*",
    "10.0.*.*",
    "192.168.*.*",
    "172.16.*.*",
    "172.17.*.*",
    "172.18.*.*",
  ],
};

export default nextConfig;

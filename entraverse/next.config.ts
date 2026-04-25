import type { NextConfig } from "next";

type RemotePattern = NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number];

function resolveRemotePattern(urlString?: string | null): RemotePattern | null {
  if (!urlString) {
    return null;
  }

  try {
    const parsed = new URL(urlString);
    const protocol: "http" | "https" = parsed.protocol === "https:" ? "https" : "http";

    return {
      protocol,
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: "/**",
    };
  } catch {
    return null;
  }
}

const configuredApiRemotePattern = resolveRemotePattern(process.env.NEXT_PUBLIC_API_URL);

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "192.168.1.22",
        port: "8000",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.jurnal.id",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "api.entraverse.com",
        pathname: "/**",
      },
      ...(configuredApiRemotePattern ? [configuredApiRemotePattern] : []),
    ],
  },
};

export default nextConfig;
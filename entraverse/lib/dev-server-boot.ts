const globalForDevBoot = globalThis as typeof globalThis & {
  __entraverseDevServerBootId?: string;
};

export const getDevServerBootId = (): string => {
  if (!globalForDevBoot.__entraverseDevServerBootId) {
    globalForDevBoot.__entraverseDevServerBootId = `dev-${Date.now()}`;
  }

  return globalForDevBoot.__entraverseDevServerBootId;
};

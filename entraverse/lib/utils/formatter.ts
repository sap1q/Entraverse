export const formatCurrencyIDR = (value: number): string => {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Math.max(0, Math.round(value)))}`;
};

export const formatCompactNumber = (value: number): string => {
  return new Intl.NumberFormat("id-ID", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(Math.max(0, value));
};

export const formatDateID = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tanggal tidak valid";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};

export const formatDateTimeID = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tanggal tidak valid";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const formatDimension = (
  dimensions?: {
    length: number;
    width: number;
    height: number;
  } | null
): string => {
  if (!dimensions) return "-";
  return `${dimensions.length} x ${dimensions.width} x ${dimensions.height} cm`;
};

export const slugifyValue = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

export const stripHtmlText = (value: string): string => {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
};

export const truncateText = (value: string, limit = 160): string => {
  const normalized = value.trim();
  if (normalized.length <= limit) return normalized;

  return `${normalized.slice(0, Math.max(0, limit - 1)).trimEnd()}...`;
};

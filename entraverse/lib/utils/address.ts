const preserveUppercaseToken = (value: string): string =>
  value
    .replace(/\bRt\b/g, "RT")
    .replace(/\bRw\b/g, "RW")
    .replace(/\bDki\b/g, "DKI")
    .replace(/\bNo\b/g, "No");

export const toTitleCaseAddress = (value: string): string =>
  preserveUppercaseToken(
    value
      .toLowerCase()
      .replace(/\b([a-z])/g, (match) => match.toUpperCase())
  );

export const formatDisplayAddress = (value: string | null | undefined): string | null => {
  if (!value) return null;

  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => toTitleCaseAddress(line))
    .join("\n");
};

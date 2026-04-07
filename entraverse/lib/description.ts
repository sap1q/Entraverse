const normalizePlainTextSpacing = (value: string): string =>
  value
    .replace(/\u00a0/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const hasHtmlTag = (value: string): boolean => /<\/?[a-z][\s\S]*>/i.test(value);
const isSpacerMarker = (value: string): boolean => /^-$/.test(value.trim());
const LEADING_DASH_REGEX = /^\s*-\s+/;

const stripLeadingDashMarker = (value: string): string => value.replace(LEADING_DASH_REGEX, "").trim();

const parsePlainTextBlocks = (value: string): string[] => {
  const lines = value.split("\n");
  const blocks: string[] = [];
  let current: string[] = [];

  const flushCurrent = () => {
    const merged = current.join("\n").trim();
    if (merged) {
      blocks.push(merged);
    }
    current = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (isSpacerMarker(trimmed)) {
      flushCurrent();
      return;
    }

    if (trimmed === "") {
      flushCurrent();
      return;
    }

    current.push(stripLeadingDashMarker(line));
  });

  flushCurrent();
  return blocks;
};

export const toDescriptionHtml = (value: string): string => {
  const normalized = value.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "<p></p>";
  if (hasHtmlTag(normalized)) return normalized;

  const paragraphs = parsePlainTextBlocks(normalized).map(
    (chunk) => `<p>${escapeHtml(chunk).replace(/\n/g, "<br>")}</p>`
  );

  return paragraphs.length > 0 ? paragraphs.join("") : "<p></p>";
};

export const normalizeDescriptionHtml = (value: string): string => {
  if (!value || value.trim() === "") return "<p></p>";

  const raw = toDescriptionHtml(value);
  if (!raw) return "<p></p>";

  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return raw || "<p></p>";
  }

  const parser = new DOMParser();
  const documentNode = parser.parseFromString(raw, "text/html");

  documentNode.querySelectorAll("script,style,iframe,object,embed").forEach((node) => node.remove());

  const blockSelector = "p,li,blockquote,h1,h2,h3,h4,h5,h6";
  documentNode.querySelectorAll(blockSelector).forEach((node) => {
    const rawText = normalizePlainTextSpacing(node.textContent ?? "");
    const text = stripLeadingDashMarker(rawText);
    if (!text && !node.querySelector("br")) {
      node.remove();
      return;
    }

    if (text !== rawText) {
      node.textContent = text;
    }
  });

  const htmlWithBlockSpacing = documentNode.body.innerHTML
    .replace(/<\/(p|li|blockquote|h[1-6])>\s*</gi, "</$1>\n<");

  let normalized = htmlWithBlockSpacing
    .replace(/(<br\s*\/?>\s*){3,}/gi, "<br><br>")
    .replace(/<p>\s*<\/p>/gi, "<p><br></p>")
    .replace(/<p>\s*-\s*<\/p>/gi, "")
    .trim();

  if (!normalized) normalized = "<p></p>";
  return normalized;
};

/**
 * Extract Kinopoisk ID and type from URL text.
 * Supports: kinopoisk.ru/film/<id>, kinopoisk.ru/series/<id>
 * Optional query params and trailing slash.
 */
const KINOPOISK_URL_REGEX = /kinopoisk\.ru\/(film|series)\/(\d+)/i;

export type ParsedKinopoiskLink = {
  kinopoiskId: number;
  type: "film" | "series";
} | null;

export function parseKinopoiskLink(text: string): ParsedKinopoiskLink {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim().replace(/\s+/g, " ");
  const match = trimmed.match(KINOPOISK_URL_REGEX);
  if (!match) return null;
  const [, typeStr, idStr] = match;
  const kinopoiskId = parseInt(idStr!, 10);
  if (Number.isNaN(kinopoiskId)) return null;
  const type = typeStr!.toLowerCase() === "series" ? "series" : "film";
  return { kinopoiskId, type };
}

/**
 * Extract first Kinopoisk link from message text or caption (handles newlines/whitespace).
 */
export function extractFirstKinopoiskLink(text: string | undefined): ParsedKinopoiskLink {
  if (!text) return null;
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  for (const line of lines) {
    const result = parseKinopoiskLink(line);
    if (result) return result;
  }
  return parseKinopoiskLink(text);
}

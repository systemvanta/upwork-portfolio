export function splitLines(text: string) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function splitItems(text: string) {
  const lines = splitLines(text);
  if (lines.length > 1) return lines;

  const numbered = text
    .split(/(?=\d+[.)]\s+)/)
    .map((part) => part.replace(/^\d+[.)]\s*/, "").trim())
    .filter(Boolean);
  if (numbered.length > 1) return numbered;

  const sentences = text.match(/[^.!?]+[.!?]+/g)?.map((part) => part.trim()).filter(Boolean);
  if (sentences && sentences.length > 1 && text.length > 120) return sentences;

  return lines.length ? lines : [text.trim()].filter(Boolean);
}

export function splitTradeoff(text: string): [string, string] | null {
  const lines = splitLines(text);
  if (lines.length >= 2) return [lines[0], lines.slice(1).join(" ")];

  const versus = text.split(/\s+vs\.?\s+/i);
  if (versus.length === 2) return [versus[0].trim(), versus[1].trim()];

  const but = text.split(/\s+but\s+/i);
  if (but.length === 2) return [but[0].trim(), but[1].trim()];

  return null;
}

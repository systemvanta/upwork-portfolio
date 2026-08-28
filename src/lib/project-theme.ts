export type ProjectTheme = {
  accent: string;
  accentSoft: string;
};

const NAMED: { test: RegExp; theme: ProjectTheme }[] = [
  { test: /rebecca\s*minkoff/, theme: { accent: "#8a6f52", accentSoft: "#f5efe6" } },
  { test: /skinny\s*dip/, theme: { accent: "#d61f69", accentSoft: "#fde8f1" } },
  { test: /\bkith\b/, theme: { accent: "#2a2a2a", accentSoft: "#eceae6" } },
  { test: /gorjana/, theme: { accent: "#9a7b4f", accentSoft: "#f6f0e6" } },
  { test: /cluse/, theme: { accent: "#5c6b63", accentSoft: "#eef1ef" } },
  { test: /claude/, theme: { accent: "#c2410c", accentSoft: "#fdeee6" } },
  { test: /lovable/, theme: { accent: "#7c3aed", accentSoft: "#f3eafd" } },
  { test: /shopify/, theme: { accent: "#1f3d2b", accentSoft: "#e8f0ea" } },
];

const PALETTE: ProjectTheme[] = [
  { accent: "#8b3a2d", accentSoft: "#f6ebe6" },
  { accent: "#1f4d3a", accentSoft: "#e8f1ec" },
  { accent: "#243568", accentSoft: "#e8ecf5" },
  { accent: "#7a451c", accentSoft: "#f5eee4" },
  { accent: "#4a3b6b", accentSoft: "#eeeaf5" },
  { accent: "#6b2d3c", accentSoft: "#f6e9ed" },
  { accent: "#2c4a5e", accentSoft: "#e7eef3" },
  { accent: "#3f4d3a", accentSoft: "#ecefe8" },
];

function hashIndex(value: string) {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash % PALETTE.length;
}

export function themeForProject(title: string, slug: string): ProjectTheme {
  const hay = `${title} ${slug}`.toLowerCase();
  const named = NAMED.find((entry) => entry.test.test(hay));
  if (named) return named.theme;
  return PALETTE[hashIndex(slug)];
}

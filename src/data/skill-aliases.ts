const aliases: Record<string, string> = {
  "artificial intelligence": "ai",
  "react.js": "react",
  reactjs: "react",
  "react js": "react",
  "next.js": "nextjs",
  next: "nextjs",
  "node.js": "node",
  nodejs: "node",
  "vue.js": "vue",
  vuejs: "vue",
  "nuxt.js": "nuxt",
  postgresql: "postgres",
  "postgres.sql": "postgres",
  typescript: "typescript",
  ts: "typescript",
  javascript: "javascript",
  js: "javascript",
  "spring boot": "spring",
  springboot: "spring",
  "tailwind css": "tailwind",
  tailwindcss: "tailwind",
  "amazon web services": "aws",
};

export function normalizeSkill(raw: string) {
  const skill = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (!skill) return "";
  return aliases[skill] ?? skill.replace(/\./g, "");
}

export function normalizeSkills(raw: string[]) {
  return [...new Set(raw.map(normalizeSkill).filter(Boolean))].sort();
}

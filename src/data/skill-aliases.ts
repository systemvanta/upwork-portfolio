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
  "lovable.dev": "lovable",
  "rest api": "api",
  "rest-api": "api",
  apis: "api",
  "web api": "api",
  "api integration": "api-integration",
  "api integrations": "api-integration",
  "api-integrations": "api-integration",
  chatbot: "chatbot",
  "chat bot": "chatbot",
  chatbots: "chatbot",
  webhooks: "webhook",
  claude: "claude-api",
  anthropic: "claude-api",
  "claude api": "claude-api",
  cowork: "claude-cowork",
  "claude cowork": "claude-cowork",
  "prompt engineering": "prompt-engineering",
  prompting: "prompt-engineering",
  "process automation": "workflow-automation",
  "workflow automation": "workflow-automation",
  rpa: "workflow-automation",
};

export function normalizeSkill(raw: string) {
  const skill = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (!skill) return "";
  return aliases[skill] ?? skill.replace(/\./g, "");
}

export function normalizeSkills(raw: string[]) {
  return [...new Set(raw.map(normalizeSkill).filter(Boolean))].sort();
}

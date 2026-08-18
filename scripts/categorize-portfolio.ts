import type { CategorySlug } from "../src/data/categories";

type PortfolioKind = {
  category: CategorySlug;
  skills: string[];
  label: string;
};

const kinds: { test: RegExp; kind: PortfolioKind }[] = [
  {
    test: /\b(wedding photography|family photography|commercial photography|photography portfolio|photography website|photographer)\b/i,
    kind: {
      category: "photography",
      label: "Photography",
      skills: ["photography", "portfolio", "editorial"],
    },
  },
  {
    test: /\b(ugc|influencer|content creator|creator economy|hospitality content)\b/i,
    kind: {
      category: "ugc",
      label: "UGC / creator",
      skills: ["ugc", "content-creation", "video", "portfolio"],
    },
  },
  {
    test: /\b(performing arts|performer|actor)\b/i,
    kind: {
      category: "performing-arts",
      label: "Performing arts",
      skills: ["performing-arts", "portfolio"],
    },
  },
  {
    test: /\b(ux writing|ux writer|content design)\b/i,
    kind: {
      category: "ux-writing",
      label: "UX writing",
      skills: ["ux-writing", "content-design", "portfolio"],
    },
  },
  {
    test: /\b(brand design|brand systems|identity that)\b/i,
    kind: {
      category: "brand-design",
      label: "Brand design",
      skills: ["branding", "identity", "motion", "portfolio"],
    },
  },
  {
    test: /\b(graphic design|art director|visual designer)\b/i,
    kind: {
      category: "graphic-design",
      label: "Graphic design",
      skills: ["graphic-design", "art-direction", "portfolio"],
    },
  },
  {
    test: /\b(product design|ui\/ux|ux design|ux designer|human-centered)\b/i,
    kind: {
      category: "product-design",
      label: "Product design",
      skills: ["product-design", "ui", "ux", "figma", "portfolio"],
    },
  },
  {
    test: /\b(web design|digital solutions architect|frontend)\b/i,
    kind: {
      category: "web-design",
      label: "Web design",
      skills: ["web-design", "frontend", "portfolio"],
    },
  },
];

const fallback: PortfolioKind = {
  category: "product-design",
  label: "Product design",
  skills: ["design", "portfolio"],
};

export function categorizePortfolio(text: string): PortfolioKind {
  for (const row of kinds) {
    if (row.test.test(text)) return row.kind;
  }
  return fallback;
}

export const categories = [
  { slug: "shopify", label: "Shopify", group: "Ecommerce" },
  { slug: "woocommerce", label: "WooCommerce", group: "Ecommerce" },
  { slug: "magento", label: "Magento", group: "Ecommerce" },
  { slug: "bigcommerce", label: "BigCommerce", group: "Ecommerce" },
  { slug: "salesforce-commerce-cloud", label: "Salesforce Commerce Cloud", group: "Ecommerce" },
  { slug: "wordpress", label: "WordPress", group: "CMS" },
  { slug: "webflow", label: "Webflow", group: "CMS" },
  { slug: "framer", label: "Framer", group: "CMS" },
  { slug: "squarespace", label: "Squarespace", group: "CMS" },
  { slug: "wix", label: "Wix", group: "CMS" },
  { slug: "drupal", label: "Drupal", group: "CMS" },
  { slug: "contentful", label: "Contentful", group: "CMS" },
  { slug: "react", label: "React", group: "Web stack" },
  { slug: "next-js", label: "Next.js", group: "Web stack" },
  { slug: "vue", label: "Vue.js", group: "Web stack" },
  { slug: "angular", label: "Angular", group: "Web stack" },
  { slug: "node-js", label: "Node.js", group: "Web stack" },
  { slug: "laravel", label: "Laravel", group: "Web stack" },
  { slug: "django", label: "Django", group: "Web stack" },
  { slug: "ruby-on-rails", label: "Ruby on Rails", group: "Web stack" },
  { slug: "dotnet", label: ".NET", group: "Web stack" },
  { slug: "php", label: "PHP", group: "Web stack" },
  { slug: "python", label: "Python", group: "Web stack" },
  { slug: "java", label: "Java", group: "Web stack" },
  { slug: "flutter", label: "Flutter", group: "Mobile" },
  { slug: "react-native", label: "React Native", group: "Mobile" },
  { slug: "ios", label: "iOS", group: "Mobile" },
  { slug: "android", label: "Android", group: "Mobile" },
  { slug: "aws", label: "AWS", group: "Cloud" },
  { slug: "n8n", label: "n8n", group: "Workflow" },
  { slug: "make", label: "Make", group: "Workflow" },
  { slug: "zapier", label: "Zapier", group: "Workflow" },
  { slug: "power-automate", label: "Power Automate", group: "Workflow" },
  { slug: "pipedream", label: "Pipedream", group: "Workflow" },
  { slug: "api-integration", label: "API integration", group: "Workflow" },
  { slug: "ai-automation", label: "AI Automation", group: "AI automation & agents" },
  { slug: "ai-agents", label: "AI Agents", group: "AI automation & agents" },
  { slug: "langchain", label: "LangChain", group: "AI automation & agents" },
  { slug: "openai", label: "OpenAI", group: "AI automation & agents" },
  { slug: "voiceflow", label: "Voiceflow", group: "AI automation & agents" },
  { slug: "chatbot", label: "Chatbot", group: "AI automation & agents" },
  { slug: "salesforce", label: "Salesforce", group: "Business platforms" },
  { slug: "hubspot", label: "HubSpot", group: "Business platforms" },
  { slug: "bubble", label: "Bubble", group: "No-code" },
  { slug: "lovable", label: "Lovable", group: "No-code" },
  { slug: "photography", label: "Photography", group: "Portfolio" },
  { slug: "product-design", label: "Product design", group: "Portfolio" },
  { slug: "brand-design", label: "Brand design", group: "Portfolio" },
  { slug: "graphic-design", label: "Graphic design", group: "Portfolio" },
  { slug: "ux-writing", label: "UX writing", group: "Portfolio" },
  { slug: "ugc", label: "UGC / creator", group: "Portfolio" },
  { slug: "performing-arts", label: "Performing arts", group: "Portfolio" },
  { slug: "web-design", label: "Web design", group: "Portfolio" },
] as const;

export type CategorySlug = (typeof categories)[number]["slug"];

const slugs = new Set<string>(categories.map((category) => category.slug));

export function isCategorySlug(value: string): value is CategorySlug {
  return slugs.has(value);
}

export function categoryLabel(slug: string) {
  return categories.find((category) => category.slug === slug)?.label ?? slug;
}

export function categoryGroups() {
  const groups = new Map<string, { slug: string; label: string }[]>();
  for (const category of categories) {
    const list = groups.get(category.group) ?? [];
    list.push({ slug: category.slug, label: category.label });
    groups.set(category.group, list);
  }
  return [...groups.entries()].map(([group, items]) => ({ group, items }));
}

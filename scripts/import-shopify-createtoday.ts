import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { normalizeSkills } from "../src/data/skill-aliases";
import { saveBufferUpload } from "../src/lib/media-store";
import {
  downloadDemoImage,
  loadCreateTodayShopifyDemos,
  normalizeKey,
} from "./createtoday-demos";

const examples: { title: string; liveUrl: string; description: string }[] = [
  {
    title: "FOLD Reformer",
    liveUrl: "https://foldreformer.ae/",
    description:
      "This home fitness equipment site uses a rotating announcement ticker, italic serif headings mixed with bold sans-serif, and lifestyle photography overlaid with feature callouts.",
  },
  {
    title: "Aleenta Health Club",
    liveUrl: "https://aleentabarre.com/",
    description:
      'This fitness studio site centers its value proposition around life phases with "Supporting you through every phase of womanhood" as the hero statement, paired with candid lifestyle photography of women laughing together.',
  },
  {
    title: "100 Coconuts",
    liveUrl: "https://www.100coconuts.com/",
    description:
      "This coconut water brand site uses wavy section dividers and floating product cans against bright cyan and yellow backgrounds to convey tropical energy.",
  },
  {
    title: "Agemate",
    liveUrl: "https://agemate-uk.myshopify.com/",
    description:
      'This longevity supplement site anchors trust with "100 day risk-free trial" and "17 Human Trials on NMN" alongside product imagery showing powder and containers on geometric platforms.',
  },
  {
    title: "Aguadulce",
    liveUrl: "https://aguadulce.store/",
    description:
      "This specialty coffee site anchors its hero with a vibrant Costa Rican folk-art mandala overlaying hands harvesting red cherries.",
  },
  {
    title: "Def Jam",
    liveUrl: "https://defjamshop.com/",
    description:
      "This vinyl retailer site uses monospaced serif typography and dark red CTAs to sell hip-hop records, anchored by cinematic artist photography in the hero.",
  },
  {
    title: "Death Before Decaf",
    liveUrl: "https://deathbeforedecaf.com.au/",
    description:
      'This coffee roaster site leads with storefront photography and owner portraits instead of styled product shots, then stacks promotional urgency—free shipping, limited mug offer, "OPEN 24/7" badges—across every section.',
  },
  {
    title: "DedCool",
    liveUrl: "https://dedcool.com/",
    description:
      'This clean beauty DTC site uses a split hero with cream and blue panels, stacked serif and sans-serif headlines ("LAUNDRY DAY / Made Easy"), and a scrolling ticker announcing "FREE SHIPPING," "LIMITED EDITION," and "TREAT SAMPLE" promotions.',
  },
  {
    title: "Ahaa Skincare",
    liveUrl: "https://ahaaskincare.com/",
    description:
      'This skincare site opens with a black banner declaring "Because nothing else works" and arranges products in a three-column grid with angled bottle photography and 5-star ratings.',
  },
  {
    title: "In Search Of",
    liveUrl: "https://insearchofshop.com/en-de",
    description:
      'This independent eyewear and clothing shop pairs serif italic headlines with a hot pink marquee repeating "Clothe yourself in the luxuries you deserve."',
  },
  {
    title: "Infusia",
    liveUrl: "https://infusia.co/",
    description:
      'This aromatherapy diffuser site announces payment plans and shipping offers in a scrolling black banner, then leads with "purify your space wherever you go."',
  },
  {
    title: "Ingreendients",
    liveUrl: "https://ingreendients.com/",
    description:
      'This clean beauty DTC site uses "DETOX YOUR ROUTINE®" as its product section headline and anchors trust with diverse women holding products in the hero.',
  },
  {
    title: "Tillak",
    liveUrl: "https://tillak.com/",
    description:
      'This outdoor apparel site uses lifestyle photography and color swatches to showcase functional hats with "NEW" badges highlighting recent launches.',
  },
  {
    title: "inParallel",
    liveUrl: "https://inparallel.in/",
    description:
      'This organic cotton basics brand uses "//" slashes as a logo motif and replaces hero typography letters with "///" to signal designed-in-India manufacturing.',
  },
  {
    title: "FIGLIO",
    liveUrl: "https://figlio.com/en-gb",
    description:
      "This luxury jewelry site sells gold hoops through close-up ear portraits paired with minimal product shots on cream backgrounds.",
  },
  {
    title: "Say When Beverages",
    liveUrl: "https://justsaywhen.com/en-eu",
    description:
      'This organic chai brand site leads with "Great Things Begin With A Cup Of Chai" over watermarked tea leaves, positioning community storytelling before product.',
  },
  {
    title: "Fandiem",
    liveUrl: "https://fandiem.com/",
    description:
      "This fan-engagement platform combines donate-to-win sweepstakes with charity support, using numbered step cards and artist campaign grids to present each fundraising opportunity.",
  },
  {
    title: "Conees",
    liveUrl: "https://conees.fr/",
    description:
      'This snack brand site uses bright blue as the dominant color, checkered pattern backgrounds, and French copy like "UNE MINI BOUCHÉE, UNE GRANDE ÉMOTION" to sell bite-sized ice cream cone ends.',
  },
  {
    title: "CO2 YOU",
    liveUrl: "https://co2you.com/",
    description:
      'This sparkling water maker shop positions sustainability messaging ("Bubbly Water Doesn\'t Cost the Earth") as hero H1 and uses repeating subscriber count as a social proof ticker.',
  },
  {
    title: "Teffie",
    liveUrl: "https://teffie.me/",
    description:
      'This functional snack brand site uses crossed-out ingredient lists and cookie cross-sections with ingredient callouts to justify "wholefood" positioning.',
  },
  {
    title: "Academyfits",
    liveUrl: "https://academyfits.com/",
    description:
      'This headwear shop divides its hero into "NEW ARRIVAL" and "POPULAR" columns with full-bleed moody portraits, then catalogs a "STARTER PACK" flat-lay before product grid.',
  },
  {
    title: "Terrai",
    liveUrl: "https://terrai.in/",
    description:
      'This skincare site uses mixed serif typography—"Science-backed" and "Hydration" and "in every spritz" in different weights—to break up the hero headline.',
  },
  {
    title: "Aboesafiya",
    liveUrl: "https://aboesafiya.de/",
    description:
      "This Islamic menswear shop uses \"SUNNAH ESSENTIALS '25\" in italic serif and lifestyle model photography to position modest clothing as contemporary streetwear.",
  },
  {
    title: "Myni",
    liveUrl: "https://myni.ca/",
    description:
      'This eco-friendly cleaning products site uses yellow marker underlines on key words ("Nasties," "Products") and a scrolling social proof ticker showing bottle-save counts.',
  },
  {
    title: "Apol",
    liveUrl: "https://apol.de/",
    description:
      'This sustainable headwear shop uses a full-width scrolling marquee repeating "LOOK GOOD – DO GOOD" above a carousel of limited-edition caps.',
  },
  {
    title: "AS29",
    liveUrl: "https://as29.com/",
    description:
      'This luxury jewelry e-commerce site uses editorial fashion photography and botanical product names like "BLOOM" to position gemstone jewelry as wearable art rather than accessories.',
  },
  {
    title: "TruFibr",
    liveUrl: "https://fibr.pk/",
    description:
      'This fiber supplement site leads with "#1 Product of the day" credibility and sells a subscription model with "10% discount on every recurring order" prominently displayed.',
  },
  {
    title: "Doua Socks",
    liveUrl: "https://doua.eu/",
    description:
      'This Romanian socks e-commerce site anchors its hero with a lifestyle photo and tagline "Your Step. Your Story." paired with a scrolling promo ticker promoting "Cumpără 4, primești 1 cadou!"',
  },
  {
    title: "d'you",
    liveUrl: "https://www.dyou.co/",
    description:
      'This skincare brand site uses split-panel hero imagery with surreal product photography and playful italicized serif copy: "products that work hard, so you don\'t have to."',
  },
];

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}

function clip(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

async function ensureDemo(
  prisma: PrismaClient,
  projectId: string,
  liveUrl: string,
  imageByKey: Map<string, string>,
) {
  const count = await prisma.projectMedia.count({ where: { projectId } });
  if (count > 0) return;
  const imageUrl = imageByKey.get(normalizeKey(liveUrl));
  if (!imageUrl) return;
  const demo = await downloadDemoImage(imageUrl);
  if (!demo) return;
  const saved = await saveBufferUpload(projectId, demo.buffer, demo.ext, demo.kind);
  await prisma.projectMedia.create({
    data: {
      projectId,
      kind: saved.kind,
      src: saved.src,
      caption: "",
      sortOrder: 0,
    },
  });
}

async function main() {
  const email = process.env.ADMIN_EMAIL;
  if (!email) throw new Error("ADMIN_EMAIL is required");

  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }),
  });

  try {
    const owner = await prisma.user.findUnique({ where: { email } });
    if (!owner) {
      throw new Error(`No user for ${email}. Run prisma db seed first.`);
    }

    const gallery = await loadCreateTodayShopifyDemos();
    const imageByKey = new Map(
      gallery.map((item) => [normalizeKey(item.liveUrl), item.imageUrl]),
    );

    let created = 0;
    let updated = 0;

    for (const example of examples) {
      const slug = slugify(example.title);
      const skills = normalizeSkills(["shopify", "ecommerce", "liquid"]);
      const payload = {
        title: example.title,
        tagline: clip(example.description, 180),
        category: "shopify",
        status: "published",
        liveUrl: example.liveUrl,
        outcome: "",
        problem:
          "A DTC brand needed a Shopify storefront that could sell product on sight without looking like a generic theme.",
        constraints:
          "Shopify theme architecture, product photography, and conversion patterns common to ecommerce storefronts.",
        decision: example.description,
        tradeoff:
          "Design leans on photography and color to close the sale, rather than a near-black or purely typographic layout.",
        method: "",
        writeup: example.description,
      };

      const existing = await prisma.project.findUnique({ where: { slug } });
      if (existing) {
        await prisma.project.update({
          where: { id: existing.id },
          data: {
            ...payload,
            skills: {
              deleteMany: {},
              create: skills.map((skill) => ({ skill })),
            },
          },
        });
        await ensureDemo(prisma, existing.id, example.liveUrl, imageByKey);
        updated += 1;
        continue;
      }

      const createdProject = await prisma.project.create({
        data: {
          slug,
          ownerId: owner.id,
          ...payload,
          skills: { create: skills.map((skill) => ({ skill })) },
        },
      });
      await ensureDemo(prisma, createdProject.id, example.liveUrl, imageByKey);
      created += 1;
    }

    console.log(
      `Shopify examples registered: ${created} created, ${updated} updated, ${examples.length} total.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

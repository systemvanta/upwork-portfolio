import { redirect } from "next/navigation";
import { Footer } from "@/components/footer";
import { GenerateLink } from "@/components/generate-link";
import { Header } from "@/components/header";
import { PortfolioIntro } from "@/components/portfolio-intro";
import { parseSkillQuery } from "@/lib/match";
import { getSession } from "@/lib/session";

export default async function SkillLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ skills?: string }>;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/");

  const params = await searchParams;
  const skills = parseSkillQuery(params.skills);

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">
        <div className="card px-6 py-10 sm:px-10">
        <PortfolioIntro
          eyebrow="Generate"
          title="Client portfolio link"
          description="Create a hashed link for a client. They get a public gallery of matching work — no admin menus."
          live
        />
        <div className="rise-4">
          <GenerateLink initialSkills={skills} />
        </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
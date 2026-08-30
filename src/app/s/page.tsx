import { redirect } from "next/navigation";
import { Footer } from "@/components/footer";
import { GenerateLink } from "@/components/generate-link";
import { Header } from "@/components/header";
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
        <p className="kicker rise">
          <span className="live-dot" />
          Generate
        </p>
        <h1 className="display rise-2 mt-3 text-[36px] sm:text-[44px]">
          Client portfolio link
        </h1>
        <p className="rise-3 mt-5 max-w-2xl text-lg leading-8 text-ink-dim">
          Create a hashed link for a client. They get a public gallery of matching
          work — no admin menus.
        </p>
        <div className="rise-4 mt-10">
          <GenerateLink initialSkills={skills} />
        </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
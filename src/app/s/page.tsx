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
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-12">
        <p className="kicker">Generate</p>
        <h1 className="mt-2 text-[40px] font-semibold leading-[1.05] tracking-tight text-ink sm:text-[48px]">
          Client portfolio link
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-dim">
          Create a hashed link for a client. They get a public gallery of matching
          work — no admin menus.
        </p>
        <div className="mt-10">
          <GenerateLink initialSkills={skills} />
        </div>
      </main>
      <Footer />
    </>
  );
}
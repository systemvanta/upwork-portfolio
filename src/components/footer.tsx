import { SiteLogo } from "@/components/site-logo";

export function Footer() {
  return (
    <footer className="mt-auto px-6 py-8">
      <div className="rise mx-auto flex max-w-6xl items-center justify-between gap-4 text-[13px] text-white/85">
        <SiteLogo light />
        <span>Private by invitation</span>
      </div>
    </footer>
  );
}

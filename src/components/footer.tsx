import { SiteLogo } from "@/components/site-logo";
import { site } from "@/data/site";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-6 text-[13px] text-mist">
        <SiteLogo size={22} />
        {site.name}
      </div>
    </footer>
  );
}

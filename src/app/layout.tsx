import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Scene } from "@/components/scene";
import { site } from "@/data/site";
import "./globals.css";

const ui = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-ui",
});

export const metadata: Metadata = {
  title: {
    default: site.name,
    template: `%s — ${site.name}`,
  },
  description: site.tagline,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${ui.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans text-ink">
        <Scene />
        {children}
      </body>
    </html>
  );
}

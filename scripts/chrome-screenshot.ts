import { spawn } from "child_process";
import { mkdtemp, readFile, rm } from "fs/promises";
import os from "os";
import path from "path";

const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export async function screenshotPage(pageUrl: string) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "portfolio-shot-"));
  const out = path.join(dir, "shot.png");

  try {
    await runChrome(pageUrl, out);
    const buffer = await readFile(out);
    if (buffer.length < 60_000) return null;
    return { buffer, ext: "png" as const, kind: "image" as const };
  } catch (error) {
    console.warn(`screenshot failed: ${error instanceof Error ? error.message : error}`);
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function runChrome(pageUrl: string, out: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(
      CHROME,
      [
        "--headless",
        "--disable-gpu",
        "--hide-scrollbars",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-networking",
        "--window-size=1400,1800",
        "--virtual-time-budget=12000",
        `--screenshot=${out}`,
        pageUrl,
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Chrome screenshot timed out"));
    }, 40_000);

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`Chrome exited ${code}`));
    });
  });
}

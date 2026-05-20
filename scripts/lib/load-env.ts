import { config } from "dotenv";
import fs from "fs";
import path from "path";

/** Load `.env.local` then `.env` for CLI scripts (Playwright, seed, upload). */
export function loadEnv(): void {
  const root = process.cwd();
  const local = path.join(root, ".env.local");
  const env = path.join(root, ".env");
  if (fs.existsSync(local)) config({ path: local });
  if (fs.existsSync(env)) config({ path: env });
}

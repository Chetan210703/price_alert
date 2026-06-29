#!/usr/bin/env node
/**
 * Install Playwright Chromium for native Node deploys (Render without Docker).
 * Skipped when using the Playwright Docker image or PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1.
 */
import { execSync } from "child_process";

if (process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD === "1") {
    console.log("[postinstall] Skipping Playwright download (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1)");
    process.exit(0);
}

console.log("[postinstall] Installing Playwright Chromium (no system deps)...");
execSync("npx playwright install chromium", { stdio: "inherit" });

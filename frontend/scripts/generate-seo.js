import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const siteUrl = (process.env.VITE_SITE_URL || "https://your-app.vercel.app").replace(/\/$/, "");

fs.mkdirSync(publicDir, { recursive: true });

fs.writeFileSync(
    path.join(publicDir, "robots.txt"),
    `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`
);

fs.writeFileSync(
    path.join(publicDir, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${siteUrl}/add</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
`
);

console.log(`SEO files generated for ${siteUrl}`);

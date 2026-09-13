import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const destination = path.join(root, ".cloudflare-dist");

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });

const files = await readdir(root);

for (const name of files) {
  if (
    name.endsWith(".html") ||
    name.endsWith(".css") ||
    name.endsWith(".js") ||
    name === "_headers" ||
    name === "_redirects"
  ) {
    await cp(path.join(root, name), path.join(destination, name));
  }
}

const routes = {
  customer: "customer.html",
  "merchant-dashboard": "merchant-dashboard.html",
  "rider-app": "rider-app.html",
  "admin-dashboard": "admin-dashboard.html",
  applications: "index.html",
};

for (const [route, sourceFile] of Object.entries(routes)) {
  const input = path.join(destination, sourceFile);

  if (!existsSync(input)) {
    throw new Error(`Missing route source: ${sourceFile}`);
  }

  const routeDirectory = path.join(destination, route);
  await mkdir(routeDirectory, { recursive: true });
  await cp(input, path.join(routeDirectory, "index.html"));
}

await writeFile(
  path.join(destination, "404.html"),
  '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>خالصة</title><body><h1>الرابط غير موجود</h1><p><a href="/">العودة إلى منصة خالصة</a></p></body></html>',
  "utf8"
);

console.log("Cloudflare web bundle prepared successfully.");

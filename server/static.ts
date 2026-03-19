import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Service worker and manifest must never be cached by the browser/CDN
  // If iOS caches an old sw.js the PWA will get stuck on a stale version forever
  app.get("/sw.js", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Content-Type", "application/javascript");
    res.sendFile(path.resolve(distPath, "sw.js"));
  });

  app.get("/manifest.json", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Content-Type", "application/manifest+json");
    res.sendFile(path.resolve(distPath, "manifest.json"));
  });

  app.use(express.static(distPath, {
    // Don't let express.static override our explicit sw.js/manifest.json routes above
    index: false,
  }));

  // fall through to index.html if the file doesn't exist
  app.use("/{*path}", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

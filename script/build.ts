import { build as esbuild } from "esbuild";
import { rm } from "fs/promises";

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    external: ["pdfkit", "svg-to-pdfkit"],
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});

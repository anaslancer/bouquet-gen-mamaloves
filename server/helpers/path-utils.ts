import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Get __dirname that works in both ESM (import.meta.url) and CJS bundles.
 * When bundled to CJS, import.meta.url is undefined, so we fall back to process.argv[1].
 */
export function getDirname(importMetaUrl: string | undefined): string {
  if (importMetaUrl) {
    return path.dirname(fileURLToPath(importMetaUrl));
  }
  // Bundled CJS: use the entry script path (e.g. dist/index.cjs)
  const entry = process.argv[1] || '.';
  return path.dirname(path.resolve(process.cwd(), entry));
}

/**
 * Project root directory. Tries multiple strategies for cloud deployments:
 * 1. PROJECT_ROOT env var (set in Render/Railway if needed)
 * 2. Parent of dist/ (derived from entry script path - most reliable when bundled)
 * 3. process.cwd() as fallback
 */
export function getProjectRoot(): string {
  if (process.env.PROJECT_ROOT) {
    return path.resolve(process.env.PROJECT_ROOT);
  }
  // Entry script is at project_root/dist/index.cjs — go up one level to project root
  const entry = process.argv[1];
  if (entry) {
    const entryDir = path.dirname(path.resolve(process.cwd(), entry));
    const candidate = path.dirname(entryDir); // parent of dist/
    return candidate;
  }
  return process.cwd();
}

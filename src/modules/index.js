// Module registry — Vite scans all ./*/index.jsx files at build time.
// To install a new module: drop a folder here containing index.jsx,
// then restart the dev server (or rebuild). No manual registration needed.

const moduleFiles = import.meta.glob('./*/index.jsx', { eager: true });

export const moduleRegistry = new Map();

for (const path of Object.keys(moduleFiles)) {
  const mod = moduleFiles[path].default;
  if (mod?.id) moduleRegistry.set(mod.id, mod);
}

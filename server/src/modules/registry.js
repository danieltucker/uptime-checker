import { readdirSync, statSync } from 'node:fs';
import { join, dirname }         from 'node:path';
import { fileURLToPath }         from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// moduleId -> module definition
const registry = new Map();

export async function loadModules() {
  let entries;
  try { entries = readdirSync(__dirname); }
  catch { return registry; }

  for (const entry of entries) {
    const modulePath = join(__dirname, entry);
    try {
      if (!statSync(modulePath).isDirectory()) continue;
      const mod = await import(`${modulePath}/index.js`);
      const def = mod.default;
      if (!def?.id) continue;
      registry.set(def.id, def);
      console.log(`[modules] loaded: ${def.id} v${def.version ?? '?'}`);
    } catch (err) {
      console.warn(`[modules] failed to load "${entry}":`, err.message);
    }
  }
  return registry;
}

export { registry };

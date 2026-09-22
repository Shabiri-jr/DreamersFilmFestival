import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// MapLibre 6's module worker imports a sibling shared module. Serve both from
// the same origin: Turbopack's asset transform does not preserve that import.
const packageRoot = dirname(fileURLToPath(import.meta.resolve("maplibre-gl/package.json")));
const { version } = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
const target = fileURLToPath(new URL(`../public/maps/maplibre/${version}/`, import.meta.url));
await mkdir(target, { recursive: true });
for (const name of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  await copyFile(join(packageRoot, "dist", name), join(target, name));
}
await copyFile(join(packageRoot, "LICENSE.txt"), join(target, "LICENSE.txt"));
console.log(`Prepared MapLibre ${version} worker assets`);

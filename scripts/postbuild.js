#!/usr/bin/env node
import { readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distIndex = join(__dirname, "..", "dist", "index.js");

const content = await readFile(distIndex, "utf-8");
if (!content.startsWith("#!/usr/bin/env node")) {
  await writeFile(distIndex, "#!/usr/bin/env node\n" + content);
  console.error("Lenx MCP: shebang injected into dist/index.js");
}

import { spawnSync } from "node:child_process";
import path from "node:path";

const args = process.argv.slice(2);

if (!args.length) {
  console.error("Usage: npm run ui:add -- <component...> [shadcn options]");
  process.exit(1);
}

const valueOptions = new Set(["-c", "--cwd", "-p", "--path", "--diff", "--view"]);
const registryArgs = [];

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  registryArgs.push(
    arg.startsWith("-") || arg.includes("/") ? arg : `@github/${arg}`
  );

  if (valueOptions.has(arg) && args[index + 1] && !args[index + 1].startsWith("-")) {
    registryArgs.push(args[index + 1]);
    index += 1;
  }
}
const executable = path.join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "shadcn.cmd" : "shadcn"
);
const result = spawnSync(executable, ["add", ...registryArgs], {
  cwd: process.cwd(),
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);

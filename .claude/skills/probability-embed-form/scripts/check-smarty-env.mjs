#!/usr/bin/env node
// Reports whether the Smarty credentials are filled in a .env file.
// It NEVER prints a value — only each variable's state.
//
// Usage:  node check-smarty-env.mjs [path/to/.env]     (default: ./.env)
// Exit:   0 = usable credentials found, 1 = missing/incomplete.

import { existsSync, readFileSync } from "node:fs";

const file = process.argv[2] ?? ".env";

if (!existsSync(file)) {
  console.log(`MISSING_FILE   ${file} does not exist`);
  process.exit(1);
}

const values = new Map();
for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
  const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
  if (match) values.set(match[1], match[2].trim());
}

function state(name) {
  const value = values.get(name);
  if (value === undefined) return "missing";
  if (value === "") return "empty";
  if (/^(["']).*\1$/.test(value)) return "quoted";
  return "set";
}

const names = ["SMARTY_AUTH_ID", "SMARTY_AUTH_TOKEN", "SMARTY_WEBSITE_KEY"];
const states = Object.fromEntries(names.map((name) => [name, state(name)]));
for (const name of names) console.log(`${name.padEnd(20)} ${states[name]}`);

const filled = (name) => states[name] === "set" || states[name] === "quoted";
const pair = filled("SMARTY_AUTH_ID") && filled("SMARTY_AUTH_TOKEN");
const halfPair = filled("SMARTY_AUTH_ID") !== filled("SMARTY_AUTH_TOKEN");

if (names.some((name) => states[name] === "quoted")) {
  console.log(
    "WARN           a value is quoted: fine in .env, but paste it WITHOUT quotes in the hosting panel",
  );
}

if (pair) {
  console.log("OK             secret pair (SMARTY_AUTH_ID + SMARTY_AUTH_TOKEN)");
  process.exit(0);
}
if (filled("SMARTY_WEBSITE_KEY")) {
  console.log("OK             website key (SMARTY_WEBSITE_KEY)");
  process.exit(0);
}
console.log(
  halfPair
    ? "INCOMPLETE     only one of SMARTY_AUTH_ID / SMARTY_AUTH_TOKEN is filled — both are needed"
    : "INCOMPLETE     no Smarty credentials filled",
);
process.exit(1);

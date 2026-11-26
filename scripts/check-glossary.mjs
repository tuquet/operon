#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const rootDir = resolve(import.meta.dirname, '..');
const glossary = JSON.parse(readFileSync(resolve(rootDir, 'GLOSSARY.json'), 'utf8'));

function gitFiles(repoDir) {
  return execFileSync('git', ['-C', repoDir, 'ls-files'], { encoding: 'utf8' })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
}

const errors = [];

// 1. Validate console kebab-case file naming convention
const consoleRule = glossary.namingConventions.console;
const consoleFiles = gitFiles(resolve(rootDir, 'console'));
for (const file of consoleFiles) {
  if (!consoleRule.extensions.some((ext) => file.endsWith(ext))) continue;
  if (consoleRule.exemptPaths.some((prefix) => file.includes(prefix))) continue;
  const name = basename(file);
  if (
    consoleRule.exemptBasenames.some(
      (exempt) => name === exempt || name.startsWith(`${exempt}.`),
    )
  ) {
    continue;
  }
  const stem = name.replace(/(\.(test|spec|config|d))?\.[^.]+$/, '');
  if (/[A-Z_]/.test(stem)) {
    errors.push(`[naming:console] Expected kebab-case filename: console/${file}`);
  }
}

// 2. Validate core snake_case Rust file naming convention
const coreRule = glossary.namingConventions.core;
const coreFiles = gitFiles(resolve(rootDir, 'core'));
for (const file of coreFiles) {
  if (!coreRule.extensions.some((ext) => file.endsWith(ext))) continue;
  const stem = basename(file).replace(/\.rs$/, '');
  if (/[A-Z-]/.test(stem)) {
    errors.push(`[naming:core] Expected snake_case filename: core/${file}`);
  }
}

// 3. Validate forbidden domain aliases across tracked source files
const forbiddenAliases = glossary.terms.flatMap((entry) =>
  (entry.forbiddenAliases ?? []).map((alias) => ({ alias, canonical: entry.term })),
);

function scanRepoAliases(repoName, pathFilters) {
  const repoDir = resolve(rootDir, repoName);
  for (const { alias, canonical } of forbiddenAliases) {
    try {
      const out = execFileSync(
        'git',
        ['-C', repoDir, 'grep', '-F', '-n', '--', alias, ...pathFilters],
        { encoding: 'utf8' },
      ).trim();
      if (out) {
        for (const line of out.split(/\r?\n/)) {
          errors.push(
            `[glossary:${repoName}] Forbidden alias "${alias}" (use "${canonical}") -> ${repoName}/${line}`,
          );
        }
      }
    } catch {
      // git grep exits 1 when no matches found
    }
  }
}

scanRepoAliases('console', ['apps/', 'packages/']);
scanRepoAliases('core', ['crates/']);

if (errors.length > 0) {
  console.error('Glossary & naming convention check failed:\n');
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log(
  `Glossary & naming check passed (${glossary.terms.length} canonical terms, ${consoleFiles.length} console files, ${coreFiles.length} core files).`,
);

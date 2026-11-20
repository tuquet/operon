import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

const SUPPORTED_LOCALES = ['en-US', 'vi-VN'];

const CORE_NAMESPACES = new Set([
  'authentication',
  'common',
  'preferences',
  'profile',
  'term',
  'ui',
]);

function getAppNames() {
  const appsDir = path.join(ROOT_DIR, 'apps');
  if (!fs.existsSync(appsDir)) return [];
  return fs
    .readdirSync(appsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .toSorted();
}

function getLocaleDirs() {
  const dirs = ['packages/locales/src/langs'];
  for (const app of getAppNames()) {
    const rel = `apps/${app}/src/locales/langs`;
    if (fs.existsSync(path.join(ROOT_DIR, rel))) {
      dirs.push(rel);
    }
  }
  return dirs;
}

const VN_DIACRITIC_REGEX =
  /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ]/;

function loadLocaleTree(locale) {
  const tree = {};
  for (const relDir of getLocaleDirs()) {
    const absDir = path.join(ROOT_DIR, relDir, locale);
    if (!fs.existsSync(absDir)) continue;
    for (const file of fs.readdirSync(absDir)) {
      if (!file.endsWith('.json')) continue;
      const namespace = file.replace(/\.json$/, '');
      const content = JSON.parse(
        fs.readFileSync(path.join(absDir, file), 'utf8'),
      );
      tree[namespace] = {
        ...tree[namespace],
        ...content,
      };
    }
  }
  return tree;
}

function flattenObject(obj, prefix = '', result = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const nextPath = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenObject(value, nextPath, result);
    } else {
      result[nextPath] = value;
    }
  }
  return result;
}

function getByPath(obj, keyPath) {
  let acc = obj;
  for (const part of keyPath.split('.')) {
    acc = acc && acc[part] !== undefined ? acc[part] : undefined;
  }
  return acc;
}

function walkSourceFiles(dir, files = []) {
  const absDir = path.isAbsolute(dir) ? dir : path.join(ROOT_DIR, dir);
  if (!fs.existsSync(absDir)) return files;

  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (
      [
        '.git',
        '.turbo',
        '__tests__',
        'dist',
        'dist.bak',
        'langs',
        'locales',
        'node_modules',
        'src-tauri',
        'target',
      ].includes(entry.name)
    ) {
      continue;
    }
    const fullPath = path.join(absDir, entry.name);
    if (entry.isDirectory()) {
      walkSourceFiles(fullPath, files);
    } else if (
      /\.(?:vue|ts|tsx)$/.test(entry.name) &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.spec.ts') &&
      !entry.name.endsWith('.d.ts')
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

export function auditI18n(options = {}) {
  const silent = Boolean(options.silent);
  const trees = {};
  const flatMaps = {};

  for (const locale of SUPPORTED_LOCALES) {
    trees[locale] = loadLocaleTree(locale);
    flatMaps[locale] = flattenObject(trees[locale]);
  }

  const enKeys = new Set(Object.keys(flatMaps['en-US']));
  const viKeys = new Set(Object.keys(flatMaps['vi-VN']));

  const missingInVi = [...enKeys].filter((k) => !viKeys.has(k));
  const missingInEn = [...viKeys].filter((k) => !enKeys.has(k));

  // Extract used i18n keys across apps/*/src and packages/effects
  const appNames = getAppNames();
  const appFiles = appNames.flatMap((app) =>
    walkSourceFiles(`apps/${app}/src`),
  );
  const referencedFiles = [...appFiles, ...walkSourceFiles('packages/effects')];
  const namespacePattern = [
    'page',
    ...CORE_NAMESPACES,
    ...appNames.filter((app) => app !== 'shell'),
  ].join('|');
  const keyPatterns = [
    /(?:\$t|\bt)\(\s*["'`]([a-zA-Z0-9_.-]+)["'`]/gs,
    /(?:labelKey|allLabelKey|titleKey|descKey|placeholderKey):\s*["'`]([a-zA-Z0-9_.-]+)["'`]/gs,
    new RegExp(
      `title:\\s*["'\`]((?:${namespacePattern})\\.[a-zA-Z0-9_.-]+)["'\`]`,
      'gs',
    ),
  ];

  const missingUsedKeys = [];
  const crossScopeLeaks = [];
  let totalReferencedCount = 0;

  for (const file of referencedFiles) {
    const rawContent = fs.readFileSync(file, 'utf8');
    // Strip block comments, HTML comments, and single-line comments so JSDoc examples are ignored
    const content = rawContent
      .replaceAll(/\/\*[\s\S]*?\*\//g, '')
      .replaceAll(/<!--[\s\S]*?-->/g, '')
      .replaceAll(/^\s*\/\/.*$/gm, '');
    const relFile = path.relative(ROOT_DIR, file);
    const normalizedRel = relFile.replaceAll('\\', '/');
    const sourceApp = normalizedRel.match(/^apps\/([^/]+)\//)?.[1];

    for (const pattern of keyPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const key = match[1].trim();
        if (!key || !key.includes('.') || key.includes('${')) continue;
        totalReferencedCount++;

        const enVal = getByPath(trees['en-US'], key);
        const viVal = getByPath(trees['vi-VN'], key);

        if (typeof enVal !== 'string' || typeof viVal !== 'string') {
          missingUsedKeys.push({
            enExists: typeof enVal === 'string',
            file: relFile,
            key,
            viExists: typeof viVal === 'string',
          });
        }

        // Enforce scoped locale ownership across apps
        const [topNs, subNs] = key.split('.');
        if (sourceApp && sourceApp !== 'shell') {
          const isAllowed =
            CORE_NAMESPACES.has(topNs) ||
            topNs === sourceApp ||
            (topNs === 'page' && subNs === sourceApp);
          if (!isAllowed) {
            crossScopeLeaks.push({ file: relFile, key, sourceApp });
          }
        } else if (
          sourceApp === 'shell' &&
          !CORE_NAMESPACES.has(topNs) &&
          topNs !== 'page'
        ) {
          crossScopeLeaks.push({ file: relFile, key, sourceApp });
        }
      }
    }
  }

  // Scan for hardcoded Vietnamese lines in apps/*/src
  const hardcodedVnLeaks = [];
  for (const file of appFiles) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    const relFile = path.relative(ROOT_DIR, file);
    let inBlockComment = false;

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('/*') || trimmed.startsWith('/**')) {
        inBlockComment = true;
      }
      if (inBlockComment) {
        if (trimmed.includes('*/')) {
          inBlockComment = false;
        }
        return;
      }
      if (
        trimmed.startsWith('//') ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('<!--')
      ) {
        return;
      }
      const codeOnly = line
        .replace(/\/\/.*$/, '')
        .replaceAll(/<!--.*?-->/g, '');
      if (VN_DIACRITIC_REGEX.test(codeOnly)) {
        hardcodedVnLeaks.push({
          file: relFile,
          line: index + 1,
          text: trimmed,
        });
      }
    });
  }

  // Scan locale messages for raw `{{ }}` — vue-i18n treats it as interpolation and
  // THROWS at render time, silently blanking the whole component (no console error,
  // no Sentry event). Escape as {'{'} or reword the message instead.
  const interpolationLeaks = [];
  for (const locale of SUPPORTED_LOCALES) {
    for (const [key, value] of Object.entries(flatMaps[locale])) {
      if (typeof value === 'string' && /\{\{|\}\}/.test(value)) {
        interpolationLeaks.push({ key, locale, value });
      }
    }
  }

  if (!silent) {
    console.log('============================================================');
    console.log('  Admin i18n Integrity Report (en-US <-> vi-VN)');
    console.log('============================================================');
    console.log(`  - Total en-US dictionary keys : ${enKeys.size}`);
    console.log(`  - Total vi-VN dictionary keys : ${viKeys.size}`);
    console.log(`  - Referenced keys verified    : ${totalReferencedCount}`);
    console.log(`  - Missing keys in vi-VN       : ${missingInVi.length}`);
    console.log(`  - Missing keys in en-US       : ${missingInEn.length}`);
    console.log(`  - Unresolved $t(...) calls    : ${missingUsedKeys.length}`);
    console.log(`  - Cross-scope locale leaks    : ${crossScopeLeaks.length}`);
    console.log(`  - Hardcoded Vietnamese lines  : ${hardcodedVnLeaks.length}`);
    console.log(
      `  - Raw {{ }} interpolation leaks: ${interpolationLeaks.length}`,
    );
    console.log('============================================================');
  }

  let hasError = false;

  if (missingInVi.length > 0) {
    hasError = true;
    if (!silent) {
      console.error('\n[ERROR] Keys present in en-US but missing in vi-VN:');
      for (const k of missingInVi) console.error(`  - ${k}`);
    }
  }

  if (missingInEn.length > 0) {
    hasError = true;
    if (!silent) {
      console.error('\n[ERROR] Keys present in vi-VN but missing in en-US:');
      for (const k of missingInEn) console.error(`  - ${k}`);
    }
  }

  if (missingUsedKeys.length > 0) {
    hasError = true;
    if (!silent) {
      console.error(
        '\n[ERROR] Referenced i18n keys missing from locale files:',
      );
      for (const item of missingUsedKeys) {
        console.error(
          `  - ${item.key} in ${item.file} (en-US: ${item.enExists}, vi-VN: ${item.viExists})`,
        );
      }
    }
  }

  if (crossScopeLeaks.length > 0) {
    hasError = true;
    if (!silent) {
      console.error('\n[ERROR] Cross-app locale scope violation detected:');
      for (const leak of crossScopeLeaks) {
        console.error(
          `  - ${leak.key} referenced in ${leak.file} (app "${leak.sourceApp}" cannot read sibling/shell private namespaces)`,
        );
      }
    }
  }

  if (hardcodedVnLeaks.length > 0) {
    hasError = true;
    if (!silent) {
      console.error(
        '\n[ERROR] Hardcoded Vietnamese text found in source files:',
      );
      for (const leak of hardcodedVnLeaks) {
        console.error(`  - ${leak.file}:${leak.line}: ${leak.text}`);
      }
    }
  }

  if (interpolationLeaks.length > 0) {
    hasError = true;
    if (!silent) {
      console.error(
        '\n[ERROR] Locale messages contain raw `{{ }}` — vue-i18n will throw at render:',
      );
      for (const leak of interpolationLeaks) {
        console.error(`  - ${leak.locale} · ${leak.key}: ${leak.value}`);
      }
      console.error("  Fix: reword the message or escape with {'{'} / {'}'}.");
    }
  }

  if (!silent && !hasError) {
    console.log('  STATUS: PASS (100% i18n parity & zero missing keys)');
  }

  return {
    enKeysCount: enKeys.size,
    viKeysCount: viKeys.size,
    totalReferencedCount,
    missingInVi,
    missingInEn,
    missingUsedKeys,
    crossScopeLeaks,
    hardcodedVnLeaks,
    interpolationLeaks,
    hasError,
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const result = auditI18n();
  if (result.hasError) {
    process.exit(1);
  }
}

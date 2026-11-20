import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

import { workspacePackages } from './workspace-packages.mjs';

export function violatesBoundary(source, target) {
  const from = source.replaceAll('\\', '/');
  const to = target.replaceAll('\\', '/');
  const sourceApp = from.match(/^apps\/([^/]+)/)?.[1];
  const targetApp = to.match(/^apps\/([^/]+)/)?.[1];
  if (from.startsWith('packages/') && targetApp) return true;
  return Boolean(
    sourceApp && sourceApp !== 'shell' && targetApp && targetApp !== sourceApp,
  );
}

export function importSpecifiers(source, filename) {
  const scripts = filename.endsWith('.vue')
    ? [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
        .map((match) => match[1])
        .join('\n')
    : source;
  const ast = ts.createSourceFile(
    filename,
    scripts,
    ts.ScriptTarget.Latest,
    true,
    /\.[jt]sx$/.test(filename) ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const imports = [];
  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      imports.push(node.moduleSpecifier.text);
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        node.expression.getText(ast) === 'require') &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      imports.push(node.arguments[0].text);
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteralLike(node.argument.literal)
    ) {
      imports.push(node.argument.literal.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return imports;
}

export async function checkArchitecture(root = process.cwd()) {
  const packages = await workspacePackages(root);
  const errors = [];
  const localPath = (path) => relative(root, path).split(sep).join('/');
  function targetPath(specifier, file) {
    if (specifier.startsWith('.'))
      return localPath(resolve(dirname(file), specifier));
    const target = packages.find(
      ({ manifest }) =>
        specifier === manifest.name ||
        specifier.startsWith(`${manifest.name}/`),
    );
    return target ? localPath(target.directory) : undefined;
  }
  async function scan(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (
        ['dist', 'node_modules', 'src-tauri', 'target'].includes(entry.name) ||
        entry.name.startsWith('.')
      )
        continue;
      const file = join(directory, entry.name);
      if (entry.isDirectory()) await scan(file);
      else if (
        [
          '.cjs',
          '.cts',
          '.js',
          '.jsx',
          '.mjs',
          '.mts',
          '.ts',
          '.tsx',
          '.vue',
        ].includes(extname(file))
      ) {
        for (const specifier of importSpecifiers(
          await readFile(file, 'utf8'),
          file,
        )) {
          const target = targetPath(specifier, file);
          if (target && violatesBoundary(localPath(file), target))
            errors.push(`${localPath(file)} imports ${specifier}`);
        }
      }
    }
  }
  for (const { directory, manifest } of packages) {
    for (const name of Object.keys({
      ...manifest.dependencies,
      ...manifest.devDependencies,
      ...manifest.peerDependencies,
    })) {
      const target = targetPath(name, join(directory, 'package.json'));
      if (target && violatesBoundary(localPath(directory), target))
        errors.push(`${localPath(directory)}/package.json depends on ${name}`);
    }
    if (
      ['apps/', 'packages/'].some((prefix) =>
        localPath(directory).startsWith(prefix),
      )
    )
      await scan(directory);
  }
  return errors;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const errors = await checkArchitecture();
  if (errors.length > 0) {
    console.error(`Architecture violations:\n${errors.join('\n')}`);
    process.exitCode = 1;
  } else console.log('Architecture boundaries passed.');
}

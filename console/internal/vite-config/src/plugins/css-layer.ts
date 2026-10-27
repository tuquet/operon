import type { Plugin } from 'vite';

interface CssLayerRule {
  /** Layer name; must declare layer order before @import 'tailwindcss' in CSS (see internal/tailwind-config/theme.css) */
  layerName: string;
  /** Package name to wrap in layer (matches package's CSS module ID in node_modules) */
  packageName: string;
}

function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/**
 * Kept consistent with the layer order in internal/tailwind-config/src/theme.css:
 * properties (Tailwind's --tw-* fallback variable layer) < preflight (base) <
 * UI library component styles (antd / el / td) < Tailwind utility classes.
 * This statement must be injected after build: under production builds, CSS is injected by chunks. If the UI
 * component library CSS chunk loads before theme.css (which contains the layer order statement), the layer name
 * would be registered with the lowest priority first, causing Tailwind base/utilities to override component styles.
 * By appending this declaration at the top of every CSS output containing UI component library layers, layer priority
 * remains correct regardless of chunk loading order (when theme.css loads first, this statement is an idempotent no-op).
 * Note that properties must be listed first: it is Tailwind's fallback variable layer for older browsers lacking
 * @property support, and must always have the lowest priority, otherwise its fallback declarations would override
 * variables written by utility classes.
 */
const LAYER_ORDER_STATEMENT =
  '@layer properties, theme, base, ant, antd, el, td, operon, components, utilities;';

/**
 * Wraps CSS from specified packages inside @layer:
 * Component library CSS is unlayered styles, and unlayered styles always override Tailwind utilities inside @layer
 * in the cascade. After wrapping in a layer, theme.css determines the order (utilities placed after component library layers),
 * allowing Tailwind utilities to override component styles.
 *
 * Note: Layer order declarations cannot be output together with layered CSS during transform phase—rolldown-vite
 * CSS bundling unlayers modules in the form of "layer order declaration + @layer rules" (rules get unlayered),
 * and asset minification also discards the declaration. Therefore, it is injected uniformly into the final CSS
 * artifacts during the generateBundle phase (see LAYER_ORDER_STATEMENT).
 *
 * @example
 * ```ts
 * plugins: [viteCssLayerPlugin({ packageName: 'element-plus', layerName: 'el' })]
 * ```
 */
export function viteCssLayerPlugin(
  rules: CssLayerRule | CssLayerRule[],
): Plugin {
  const list = Array.isArray(rules) ? rules : [rules];
  const matchers = list.map(({ layerName, packageName }) => ({
    layerName,
    regex: new RegExp(
      `${escapeRegExp(packageName).replaceAll('/', String.raw`[\\/]`)}${String.raw`[\\/]`}.+\\.css$`,
      'i',
    ),
  }));
  return {
    name: 'vite-plugin-css-layer',
    enforce: 'pre',
    transform(code, id) {
      const [file] = id.split('?', 1);
      if (!file) return;
      const matched = matchers.find((m) => m.regex.test(file));
      if (matched) {
        return { code: `@layer ${matched.layerName} {\n${code}\n}`, map: null };
      }
    },
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type !== 'asset' || !file.fileName.endsWith('.css')) {
          continue;
        }
        const css = file.source.toString();
        const matched = matchers.some((m) =>
          css.includes(`@layer ${m.layerName}`),
        );
        if (!matched) {
          continue;
        }
        // Strip potential BOM before checking to avoid duplicate layer order statement injection
        const hasStatement = css
          .replace(/^\uFEFF/, '')
          .trimStart()
          .startsWith(LAYER_ORDER_STATEMENT);
        if (hasStatement) {
          continue;
        }
        file.source = `${LAYER_ORDER_STATEMENT}\n${css}`;
      }
    },
  };
}

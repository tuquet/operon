import type { PluginOption } from 'vite';

import { EOL } from 'node:os';

import { dateUtil, readPackageJSON } from '@operon/node-utils';

/**
 * Inject license / copyright information
 * @returns
 */
async function viteLicensePlugin(
  root = process.cwd(),
): Promise<PluginOption | undefined> {
  const {
    description = '',
    homepage = '',
    version = '',
  } = await readPackageJSON(root);

  return {
    apply: 'build',
    enforce: 'post',
    generateBundle: {
      handler(_options, bundle) {
        const date = dateUtil().format('YYYY-MM-DD ');
        const copyrightText = `/*!
  * Admin
  * Version: ${version}
  * Author: vben
  * Copyright (C) 2024 Vben
  * License: MIT License
  * Description: ${description}
  * Date Created: ${date}
  * Homepage: ${homepage}
  * Contact: dev@operon.com
*/
              `.trim();

        for (const [, fileContent] of Object.entries(bundle)) {
          if (fileContent.type === 'chunk' && fileContent.isEntry) {
            // Insert license information
            const content = fileContent.code;
            const updatedContent = `${copyrightText}${EOL}${content}`;
            // Update bundle
            fileContent.code = updatedContent;
          }
        }
      },
      order: 'post',
    },
    name: 'vite:license',
  };
}

export { viteLicensePlugin };

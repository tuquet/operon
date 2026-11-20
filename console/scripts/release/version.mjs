import { assertVersions, isMain, syncVersion } from './common.mjs';

if (isMain(import.meta.url)) {
  const version = process.argv[2];
  if (version && version !== '--check')
    syncVersion(version, { canonical: true });
  else assertVersions();
  console.log(
    version && version !== '--check'
      ? `Product version synchronized to ${version}`
      : 'Product versions match.',
  );
}

import * as path from 'path';

export const REPO_ROOT = path.join(__dirname, '..');

export const PACKAGES_DIR = path.join(REPO_ROOT, 'packages');

export const PACKAGE_PREFIX = 'madcap-';

export enum PACKAGE_DIRS {
  src = 'src',
  commonjs = 'lib',
  es = 'es',
  umd = 'umd'
}

export const BASE_NAMESPACE = 'base';

export enum NAMESPACES {
  errors = 'errors',
  handlers = 'handlers',
  reporters = 'reporters'
}

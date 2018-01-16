import * as fs from 'fs-extra';
import * as path from 'path';
import * as webpack from 'webpack';
import {
  BASE_NAMESPACE,
  NAMESPACES,
  PACKAGE_PREFIX,
  PACKAGES_DIR,
  PACKAGE_DIRS,
  REPO_ROOT
} from './constants';

interface IBaseEntryPoints {
  base: webpack.Entry;
}

interface INamespacedEntryPoints {
  errors: webpack.Entry;
  handlers: webpack.Entry;
  reporters: webpack.Entry;
}

type IEntryPoints = IBaseEntryPoints &
  INamespacedEntryPoints & { [key: string]: webpack.Entry };

interface IEntryPointsMap {
  [srcDir: string]: IEntryPoints;
}

function shouldFileCompile(fileName: string): boolean {
  return fileName.endsWith('.ts');
}

function packagePath(
  packageName: string,
  subdir: PACKAGE_DIRS | '' = ''
): string {
  const packageDirName = PACKAGE_PREFIX + packageName;
  return path.join(PACKAGES_DIR, packageDirName, subdir);
}

export async function buildBaseEntryPoints(
  packageName: string
): Promise<IEntryPoints> {
  const entryPoints = {} as IEntryPoints;
  const srcPath = packagePath(packageName, PACKAGE_DIRS.src);
  const baseFiles = (await fs.readdir(srcPath)).filter(shouldFileCompile);
  if (baseFiles.length) {
    await Promise.all(
      baseFiles.map(async file => {
        const absFilePath = path.join(srcPath, file);
        if ((await fs.stat(absFilePath)).isFile()) {
          entryPoints[BASE_NAMESPACE] = entryPoints[BASE_NAMESPACE] || {};
          let entryKey = path.basename(file, '.ts');
          if (entryKey === 'index') {
            entryKey = packageName;
          }
          entryPoints[BASE_NAMESPACE][entryKey] = path.join(srcPath, file);
        }
      })
    );
  }
  return entryPoints;
}

export async function buildNamespacedEntryPoints(packageName: string) {
  const srcPath = packagePath(packageName, PACKAGE_DIRS.src);
  let entryPoints = {} as IEntryPoints;
  if (packageName !== 'core') {
    entryPoints = await Object.keys(NAMESPACES).reduce(
      async (entryPointsPromise, namespace) => {
        const entryPoints = await entryPointsPromise;
        const namespaceDir = path.join(srcPath, namespace);

        if (await fs.pathExists(namespaceDir)) {
          entryPoints[namespace] = {};
          const files = await fs.readdir(namespaceDir);
          files.forEach(file => {
            const entryKey = path.basename(file, '.ts');
            entryPoints[namespace][entryKey] = path.join(namespaceDir, file);
          });
        }

        return entryPoints;
      },
      Promise.resolve(entryPoints)
    );
  }
  return entryPoints;
}

export async function buildEntryPointsMap(): Promise<IEntryPointsMap> {
  const packageDirNames = await fs.readdir(PACKAGES_DIR);

  return await packageDirNames.reduce(
    async (entryPointsPromise, packageDirName): Promise<IEntryPointsMap> => {
      const entryPoints = await entryPointsPromise;
      const packageName = packageDirName.replace(PACKAGE_PREFIX, '');

      const baseEntryPoints = await buildBaseEntryPoints(packageName);
      const namespacedEntryPoints = await buildNamespacedEntryPoints(
        packageName
      );

      return {
        ...entryPoints,
        [packagePath(packageName)]: {
          ...baseEntryPoints,
          ...namespacedEntryPoints
        }
      };
    },
    Promise.resolve({})
  );
}

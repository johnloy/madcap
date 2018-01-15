import * as fs from 'fs-extra';
import * as path from 'path';
import * as webpack from 'webpack';

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

const repoRoot = path.join(__dirname, '../..');
const packagesDir = path.join(repoRoot, 'packages');
const packagePrefix = 'madcap-';
const enum Paths {
  src = 'src',
  commonjs = 'lib',
  es = 'es',
  umd = 'umd'
}
enum Namespaces {
  errors = 'errors',
  handlers = 'handlers',
  reporters = 'reporters'
}

async function buildWebpackEntryPoints(): Promise<any> {
  const packageDirs = await fs.readdir(packagesDir);

  const entryPoints = await packageDirs.reduce(
    async (entryPointsPromise, packageDir): Promise<any> => {
      const entryPoints = await entryPointsPromise;

      const absPackageSrcPath = path.join(packagesDir, packageDir, Paths.src);
      const packageName = packageDir.replace(packagePrefix, '');

      entryPoints[packageName] = {};

      const rootFiles = await fs.readdir(absPackageSrcPath);
      if (rootFiles) {
        entryPoints[packageName]['base'] = {};
      }
      await rootFiles.forEach(async file => {
        const absFilePath = path.join(absPackageSrcPath, file);
        if ((await fs.stat(absFilePath)).isFile()) {
          const entryKey = path.basename(file, '.ts');
          entryPoints[packageName]['base'][entryKey] = path.join(
            absPackageSrcPath,
            file
          );
        }
      });
      // const indexFile = path.join(absPackageSrcPath, 'index.ts');
      // if (await fs.pathExists(indexFile)) {
      //   entryPoints[packageName]['base'] = { [packageName]: indexFile };
      // }

      if (packageName !== 'core') {
        await Object.keys(Namespaces).reduce(
          async (namespacesObjPromise, namespace) => {
            const namespaces = await namespacesObjPromise;
            const namespaceDir = path.join(absPackageSrcPath, namespace);

            if (await fs.pathExists(namespaceDir)) {
              entryPoints[packageName][namespace] = {};
              const files = await fs.readdir(namespaceDir);
              files.forEach(file => {
                const entryKey = path.basename(file, '.ts');
                entryPoints[packageName][namespace][entryKey] = path.join(
                  namespaceDir,
                  file
                );
              });
            }

            return entryPoints;
          },
          Promise.resolve({})
        );
      }

      return entryPoints;
    },
    Promise.resolve({})
  );

  return entryPoints;
}

console.log(buildWebpackEntryPoints().then(console.log));

import { buildEntryPointsMap } from '../lib/build-entry-points';
import { PACKAGE_DIRS, REPO_ROOT } from '../lib/constants';
import * as util from 'util';
import { spawn } from 'child_process';
import * as path from 'path';
import { inherits } from 'util';
const glob = require('glob-promise');

const shouldBuildEsModules = process.argv[2] === 'es';

function spawnCompilation(packagePath: string) {
  return new Promise(async (resolve, reject) => {
    const tsFiles = await glob(
      path.join(packagePath, PACKAGE_DIRS.src) + '/**/*.ts'
    );
    let tscOptions: any[] = [];
    if (shouldBuildEsModules) {
      tscOptions = tscOptions.concat(
        '-m',
        'es2015',
        '-t',
        'es2015',
        '--outDir',
        PACKAGE_DIRS.es
      );
    }
    const compilation = spawn('tsc', [...tscOptions], {
      cwd: packagePath,
      stdio: 'inherit'
    });

    compilation.on('error', reject);
    compilation.on('close', code => resolve(code));
  });
}

buildEntryPointsMap().then(async entryPoints => {
  const compilations = Object.keys(entryPoints).map(spawnCompilation);
  await Promise.all(compilations);
});

import * as fs from 'fs-extra';
import * as path from 'path';
import * as webpack from 'webpack';
import { BASE_NAMESPACE, PACKAGE_DIRS } from './lib/constants';
import { buildEntryPointsMap } from './lib/build-entry-points';

const baseConfig: Partial<webpack.Configuration> = {
  devtool: 'source-map',

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            compilerOptions: {
              target: 'es5'
            }
          }
        },
        exclude: /node_modules/
      }
    ]
  },

  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      sourceMap: true,
      include: /\.min\.js$/
    })
  ],

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json']
  },

  watchOptions: {
    ignored: /node_modules/
  }
};

function buildOutputConfig(
  packageDir: string,
  namespace: string | undefined,
  env: any
): webpack.Output {
  return {
    path: path.join(packageDir, PACKAGE_DIRS.umd),
    filename: 'madcap.[name].' + (env.min ? 'min.' : '') + 'js',
    library: ['Madcap', namespace, '[name]'].filter(i => i) as string[],
    libraryTarget: 'umd'
  };
}

function buildConfig(
  packageDir: string,
  entryPoints: webpack.Entry,
  namespace: string,
  env: any
): webpack.Configuration | void {
  if (typeof entryPoints === 'object' && Object.keys(entryPoints).length) {
    return {
      ...baseConfig,
      entry: entryPoints,
      output: buildOutputConfig(
        packageDir,
        namespace === BASE_NAMESPACE ? undefined : namespace,
        env
      )
    };
  }
}

module.exports = async (
  env: webpack.Configuration = {}
): Promise<webpack.Configuration[]> => {
  const packageEntryPointsMap = await buildEntryPointsMap();
  let configs: webpack.Configuration[] = [];
  for (const packageDir of Object.keys(packageEntryPointsMap)) {
    const packageEntryPoints = packageEntryPointsMap[packageDir];
    const {
      base: baseEntryPoints,
      ...namespacedEntryPoints
    } = packageEntryPoints;
    const namespaces = Object.keys(namespacedEntryPoints);
    const packageConfigs: (webpack.Configuration | void)[] = [
      buildConfig(packageDir, baseEntryPoints, BASE_NAMESPACE, env),
      buildConfig(packageDir, baseEntryPoints, BASE_NAMESPACE, {
        ...env,
        min: true
      }),
      ...namespaces.map(ns =>
        buildConfig(packageDir, packageEntryPoints[ns], ns, env)
      ),
      ...namespaces.map(ns =>
        buildConfig(packageDir, packageEntryPoints[ns], ns, {
          ...env,
          min: true
        })
      )
    ];
    configs = [
      ...configs,
      ...(packageConfigs.filter(c => c) as webpack.Configuration[])
    ];
  }
  return configs;
};

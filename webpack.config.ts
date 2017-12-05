import * as webpack from 'webpack';
import * as path from 'path';

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

const paths = {
  SRC: path.join(__dirname, 'src'),
  DIST: path.join(__dirname, 'dist')
};

const baseConfig = {
  // devtool: 'source-map',

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },

  // plugins: [new webpack.optimize.UglifyJsPlugin()],

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json']
  },

  watchOptions: {
    ignored: /node_modules/
  }
};

const ENTRY_POINTS: IEntryPoints = {
  base: {
    core: path.join(paths.SRC, 'madcap'),
    errors: path.join(paths.SRC, 'errors', 'index'),
    handlers: path.join(paths.SRC, 'handlers', 'index'),
    reporters: path.join(paths.SRC, 'reporters', 'index')
  },
  errors: {
    AssetLoadError: path.join(paths.SRC, 'errors', 'AssetLoadError'),
    FetchError: path.join(paths.SRC, 'errors', 'FetchError'),
    FontLoadError: path.join(paths.SRC, 'errors', 'FontLoadError'),
    ImageLoadError: path.join(paths.SRC, 'errors', 'ImageLoadError'),
    StylesheetLoadError: path.join(paths.SRC, 'errors', 'StylesheetLoadError'),
    ScriptLoadError: path.join(paths.SRC, 'errors', 'ScriptLoadError'),
    UiComponentError: path.join(paths.SRC, 'errors', 'UiComponentError')
  },
  handlers: {
    retryThenRecover: path.join(paths.SRC, 'handlers', 'retryThenRecover')
  },
  reporters: {
    errorOverlay: path.join(paths.SRC, 'reporters', 'errorOverlay'),
    reactErrorOverlay: path.join(paths.SRC, 'reporters', 'reactErrorOverlay'),
    console: path.join(paths.SRC, 'reporters', 'console')
  }
};

function buildEntryConfig(
  mapping: webpack.Entry,
  namespace: string,
  env: any
): webpack.Entry {
  return Object.keys(mapping).reduce(
    (entryPoints: webpack.Entry, filename: string): webpack.Entry =>
      ({
        ...entryPoints,
        [filename + '.dist']: ENTRY_POINTS[namespace][filename]
      } as webpack.Entry),
    mapping
  );
}

function buildOutputConfig(
  namespace: string | undefined,
  env: any
): webpack.Output {
  return {
    path: paths.DIST,
    filename: 'madcap.[name].js',
    library: ['Madcap', namespace, '[name]'].filter(i => i) as string[],
    libraryTarget: 'umd'
  };
}

function buildConfig(
  entryPoints: webpack.Entry,
  namespace: string,
  env: any
): webpack.Configuration {
  return {
    ...baseConfig,
    entry: buildEntryConfig(entryPoints, namespace, env),
    output: buildOutputConfig(namespace === 'base' ? undefined : namespace, env)
  };
}

const { base: baseEntryPoints, ...namespacedEntryPoints } = ENTRY_POINTS;

const namespaces = Object.keys(namespacedEntryPoints);

module.exports = (env: webpack.Configuration): webpack.Configuration[] => [
  buildConfig(baseEntryPoints, 'base', env),
  ...namespaces.map(ns => buildConfig(ENTRY_POINTS[ns], ns, env))
];

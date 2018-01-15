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

const enum Paths {
  SRC = 'src',
  COMMON_JS = 'lib',
  ES_MODULE = 'es',
  UMD = 'umd'
}

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

function buildEntryPoints(): IEntryPoints[] {}

const MADCAP_ENTRY_POINTS: IEntryPoints = {
  base: {
    core: path.join(__dirname, 'packages', 'madcap', Paths.SRC, 'madcap'),
    errors: path.join(
      __dirname,
      'packages',
      'madcap',
      Paths.SRC,
      'errors',
      'index'
    ),
    handlers: path.join(
      __dirname,
      'packages',
      'madcap',
      Paths.SRC,
      'handlers',
      'index'
    ),
    reporters: path.join(
      __dirname,
      'packages',
      'madcap',
      Paths.SRC,
      'reporters',
      'index'
    )
  },
  errors: {
    AssetLoadError: path.join(__dirname, Paths.SRC, 'errors', 'AssetLoadError'),
    FetchError: path.join(__dirname, Paths.SRC, 'errors', 'FetchError'),
    FontLoadError: path.join(__dirname, Paths.SRC, 'errors', 'FontLoadError'),
    ImageLoadError: path.join(__dirname, Paths.SRC, 'errors', 'ImageLoadError'),
    StylesheetLoadError: path.join(
      __dirname,
      Paths.SRC,
      'errors',
      'StylesheetLoadError'
    ),
    ScriptLoadError: path.join(
      __dirname,
      Paths.SRC,
      'errors',
      'ScriptLoadError'
    ),
    UiComponentError: path.join(
      __dirname,
      Paths.SRC,
      'errors',
      'UiComponentError'
    )
  },
  handlers: {
    retryThenRecover: path.join(
      __dirname,
      Paths.SRC,
      'handlers',
      'retryThenRecover'
    )
  },
  reporters: {
    errorOverlay: path.join(__dirname, Paths.SRC, 'reporters', 'errorOverlay'),
    reactErrorOverlay: path.join(
      __dirname,
      Paths.SRC,
      'reporters',
      'reactErrorOverlay'
    ),
    console: path.join(__dirname, Paths.SRC, 'reporters', 'console')
  }
};

function buildOutputConfig(
  namespace: string | undefined,
  env: any
): webpack.Output {
  return {
    path: Paths.UMD,
    filename: 'madcap.[name].' + (env.min ? 'min.' : '') + 'js',
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
    entry: entryPoints,
    output: buildOutputConfig(namespace === 'base' ? undefined : namespace, env)
  };
}

const { base: baseEntryPoints, ...namespacedEntryPoints } = MADCAP_ENTRY_POINTS;

const namespaces = Object.keys(namespacedEntryPoints);

module.exports = (env: webpack.Configuration = {}): webpack.Configuration[] => {
  return [
    buildConfig(baseEntryPoints, 'base', env),
    buildConfig(baseEntryPoints, 'base', { ...env, min: true }),
    ...namespaces.map(ns => buildConfig(MADCAP_ENTRY_POINTS[ns], ns, env)),
    ...namespaces.map(ns =>
      buildConfig(MADCAP_ENTRY_POINTS[ns], ns, { ...env, min: true })
    )
  ];
};

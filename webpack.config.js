const webpack = require('webpack');
const path = require('path');
const Dotenv = require('dotenv-webpack');

module.exports = {
  mode: 'production',
  resolve: {
    extensions: ['.wasm', '.mjs', '.js', '.json', '.ts'],
    mainFields: ['module', 'main'],
    fallback: {
      url: require.resolve('url/'),
      util: require.resolve('util/'),
      path: require.resolve('path-browserify'),
      buffer: require.resolve('buffer/'),
      stream: require.resolve('stream-browserify'),
      zlib: require.resolve('browserify-zlib'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      assert: require.resolve('assert/'),
      crypto: require.resolve('crypto-browserify'),
      canvas: process.env.BROWSER ? 'canvas-browser-shim' : '@napi-rs/canvas',
      'node-canvas': '@napi-rs/canvas',
      punycode: false,
      bufferutil: false,
      'utf-8-validate': false,
    },
    alias: {
      'parse5': path.resolve(__dirname, 'node_modules/parse5/dist/cjs/index.js')
    }
  },
  module: {
    rules: [
      {
        test: /\.(m?js|ts)?$/,
        exclude: /node_modules\/(?!(jsdom|parse5|data-urls|whatwg-url|whatwg-encoding|w3c-hr-time|webidl-conversions|tough-cookie|axios-cookiejar-support|http-proxy-agent|https-proxy-agent|agent-base|ws)\/).*/,
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true,
            sourceType: 'unambiguous',
            presets: [
              [
                '@babel/preset-env',
                {
                  useBuiltIns: 'usage',
                  corejs: 3,
                  targets: {
                    node: '20.0.0'
                  },
                  modules: 'commonjs'
                },
              ],
              '@babel/preset-typescript'
            ],
            plugins: [
              ['@babel/plugin-transform-private-property-in-object', { loose: true }],
              '@babel/plugin-transform-nullish-coalescing-operator',
              '@babel/plugin-transform-optional-chaining',
              ['@babel/plugin-transform-private-methods', { loose: true }],
              ['@babel/plugin-transform-class-properties', { loose: true }],
              '@babel/plugin-transform-object-rest-spread'
            ],
          },
        },
      },
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto',
        resolve: {
          fullySpecified: false
        }
      },
      {
        test: /\.wasm$/,
        type: 'asset/resource'
      },
      {
        test: /\.node$/,
        use: 'node-loader',
        exclude: /@napi-rs\/canvas-.*\.node$/
      }
    ],
    noParse: [
      /@napi-rs\/skia\..*\.node$/,
      /@napi-rs\/canvas-.*\.node$/
    ]
  },
  experiments: {
    asyncWebAssembly: true,
    topLevelAwait: true
  },
  context: path.resolve(__dirname, 'src'),
  entry: {
    login: './login.ts',
    punchin: './punchin.ts',
    punchout: './punchout.ts'
  },
  target: 'node',
  plugins: [
    new Dotenv({
      path: '.env',
      safe: true,
      allowEmptyValues: true,
      systemvars: true,
      silent: false,
      defaults: false
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer']
    }),    
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
      'process.env.JSDOM': JSON.stringify(true),
      'util._extend': 'Object.assign',
      'Object.assign': 'Object.assign'
    })
  ],
  output: {
    path: path.resolve(__dirname, 'functions'),
    filename: '[name].js',
    libraryTarget: 'commonjs',
    clean: true
  },
  optimization: {
    nodeEnv: process.env.NODE_ENV || 'production',
    minimize: process.env.NODE_ENV === 'production'
  },
  stats: {
    colors: true,
    warnings: true,
    warningsFilter: [
      /Critical dependency/,
      /CommonJS/,
      'warning',
      /Can't resolve '(bufferutil|utf-8-validate)'/
    ]
  },
  ignoreWarnings: [
    /Critical dependency/,
    /CommonJS/,
    /\[DEP0060\]/,
    /\[DEP0040\]/,
    warning => warning.module?.resource?.includes('node_modules') &&
      /Can't resolve '(bufferutil|utf-8-validate)'/.test(warning.message),
    {
      module: /node_modules\/query-string/,
      message: /export.*was not found/
    },
    {
      module: /\/node_modules\/@napi-rs\/canvas\/.*\.node$/
    },
    {
      module: /\/node_modules\/@napi-rs\/canvas\/js-binding\.js$/,
      message: /Can't resolve.*/
    },
  ],
  infrastructureLogging: {
    level: 'warn',
    debug: /webpack/
  },
  externals: [
    function(context, request, callback) {
      if (/@napi-rs\/canvas\/skia\..*/.test(request)) {
        return callback(null, 'commonjs ' + request);
      }
      if (/@napi-rs\/canvas.*$/.test(request)) {
        return callback(null, 'commonjs ' + request);
      }
      callback();
    }
  ]
};
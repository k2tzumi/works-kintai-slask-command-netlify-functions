import webpack from 'webpack';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';

export default {
  mode: isProduction ? 'production' : 'development',
  
  resolve: {
    extensions: ['.wasm', '.mjs', '.js', '.json', '.ts'],
    mainFields: ['module', 'main'],
    alias: {
      'axios/lib/utils': 'axios/unsafe/utils.js',
      'axios/lib/core/mergeConfig': 'axios/unsafe/core/mergeConfig.js',
    },
    fallback: {
      "stream": false,
      "buffer": false,
      "util": false
    }
  },
  
  module: {
    rules: [
      {
        test: /\.(m?js|ts)?$/,
        exclude: /(node_modules|bower_components|\.test\.|\.spec\.)/,
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true,
            presets: [
              [
                '@babel/preset-env',
                { 
                  targets: { node: '22.0.0' },
                  modules: 'auto',
                  useBuiltIns: 'usage',
                  corejs: 3
                },
              ],
              '@babel/preset-typescript'
            ],
            plugins: [
              '@babel/plugin-proposal-class-properties',
              '@babel/plugin-proposal-optional-chaining',
              '@babel/plugin-proposal-nullish-coalescing-operator'
            ]
          },
        },
      },
    ],
  },
  
  context: path.resolve(__dirname, 'src'),
  
  entry: {
    login: './login.ts',
    punchin: './punchin.ts',
    punchout: './punchout.ts'
  },
  
  target: 'node22',
  
  plugins: [
    new webpack.IgnorePlugin({ resourceRegExp: /vertx/ }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    }),
    new webpack.IgnorePlugin({
      checkResource(resource, context) {
        if (resource.includes('axios/lib/') && !resource.includes('axios/unsafe/')) {
          return true;
        }
        return false;
      }
    })
  ],
  
  output: {
    path: path.resolve(__dirname, 'functions'),
    filename: '[name].js',
    libraryTarget: 'commonjs2',
    clean: true,
    environment: {
      module: true,
      dynamicImport: true,
    }
  },
  
  optimization: {
    nodeEnv: process.env.NODE_ENV || 'production',
    minimize: isProduction,
    splitChunks: false,
  },
  
  externals: [
    '@netlify/functions',
    'fs', 'path', 'crypto', 'http', 'https', 'url', 'querystring',
    // 'axios'
  ],
  
  bail: true,
  devtool: isProduction ? false : 'source-map',
  
  stats: {
    colors: true,
    modules: false,
    chunks: false,
    chunkModules: false,
    entrypoints: false,
    assets: true,
    errors: true,
    warnings: true,
  },

  node: false,
  
  performance: {
    hints: isProduction ? 'warning' : false,
    maxAssetSize: 1000000, // 1MB
    maxEntrypointSize: 1000000, // 1MB
  },
};
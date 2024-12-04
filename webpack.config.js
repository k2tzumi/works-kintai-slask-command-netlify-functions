const webpack = require('webpack');
const path = require('path');

module.exports = {
  mode: 'production',
  resolve: {
    extensions: ['.wasm', '.mjs', '.js', '.json', '.ts'],
    mainFields: ['module', 'main'],
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
                { targets: { node: '20.0.0' } },
              ],
            ],
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
  target: 'node',
  plugins: [new webpack.IgnorePlugin({ resourceRegExp: /vertx/ })],
  output: {
    path: path.resolve(__dirname, 'functions'),
    filename: '[name].js',
    libraryTarget: 'commonjs',
  },
  optimization: {
    nodeEnv: process.env.NODE_ENV || 'production',
  },
  bail: true,
  devtool: false,
  stats: {
    colors: true,
  },
};

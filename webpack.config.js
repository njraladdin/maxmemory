const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    background: './js/background.js',
    contentScript: './js/contentScript.js',
    popup: './js/popup.js',
    icons: './js/icons.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'js/[name].js',
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'html', to: 'html' },
        { from: 'css', to: 'css' },
        { from: 'icons', to: 'icons' },
        { from: 'manifest.json', to: 'manifest.json' },
      ],
    }),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js']
  }
}; 
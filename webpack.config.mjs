import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const baseConfig = {
  entry: './src/chameleon-backgrounds.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    library: {
      name: 'ChameleonBackgrounds',
      type: 'umd',
      export: 'default',
    },
    globalObject: 'this',
  },
};

export default [
  {
    ...baseConfig,
    mode: 'development',
    devtool: 'source-map',
    output: {
      ...baseConfig.output,
      filename: 'chameleon-backgrounds.js',
    },
  },
  {
    ...baseConfig,
    mode: 'production',
    output: {
      ...baseConfig.output,
      filename: 'chameleon-backgrounds.min.js',
    },
  }
];

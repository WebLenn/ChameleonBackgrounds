import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  mode: 'production',
  entry: './src/chameleon-backgrounds.js',
  output: {
    filename: 'chameleon-backgrounds.min.js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      name: 'ChameleonBackgrounds',
      type: 'umd',
      export: 'default',
    },
    globalObject: 'this',
  },
};

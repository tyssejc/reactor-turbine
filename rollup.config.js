import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/engine.js',
    format: 'iife',
    name: '_satellite'
  },
  plugins: [
    nodeResolve({
      preferBuiltins: false
    }),
    commonjs()
  ]
};

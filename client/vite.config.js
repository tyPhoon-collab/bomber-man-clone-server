import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'resources/*',
          dest: 'resources',
        },
        {
          src: 'lib/*',
          dest: 'lib',
        },
      ],
    }),
  ],
});

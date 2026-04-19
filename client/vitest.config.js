import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    globals: true,
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './test-reports/junit.xml'
    },
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'lcov', 'json-summary'],
      include: [
        'src/components/**/*.{js,jsx}',
        'src/hooks/**/*.{js,jsx}',
        'src/context/**/*.{js,jsx}',
        'src/store/**/*.{js,jsx}'
      ],
      exclude: ['**/*.test.*']
    }
  }
});

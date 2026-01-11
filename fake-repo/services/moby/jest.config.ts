import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  roots: ['./src'],
  setupFilesAfterEnv: ['./jest.setup.ts'],
  displayName: {
    name: 'moby',
    color: 'green',
  },
  reporters: ['default', ['summary', { summaryThreshold: 1 }]],
};

export default config;

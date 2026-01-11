import type { Config } from 'jest';
import base from './jest.config';

const config: Config = {
  ...base,
  verbose: false,
  silent: true,
  reporters: ['@tw/test-utils/module/jest/ciReporter'],
  testEnvironmentOptions: { logger: false },
};

export default config;

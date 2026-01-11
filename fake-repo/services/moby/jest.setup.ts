import serviceConf from './tw-config.json';
import { setupJestTW } from '@tw/test-utils/module/jest';

setupJestTW({ serviceConf, mock: [] });

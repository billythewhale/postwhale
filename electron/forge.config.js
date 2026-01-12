const path = require('path');

module.exports = {
  packagerConfig: {
    name: 'PostWhale',
    executableName: 'PostWhale',
    asar: true,
    extraResource: [
      path.join(__dirname, '../backend/postwhale'),
      path.join(__dirname, '../frontend/dist')
    ],
    osxSign: {},
    osxNotarize: false
  },
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin']
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        name: 'PostWhale',
        format: 'ULFO'
      }
    }
  ]
};

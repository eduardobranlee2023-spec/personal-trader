const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('appInfo', {
  appName: 'Personal Trader',
  version: 'desktop',
});

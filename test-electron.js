const electron = require('electron');
console.log('Electron require type:', typeof electron);
console.log('Electron keys:', Object.keys(electron));
try {
    console.log('electron.app is:', typeof electron.app);
} catch (e) {
    console.log('Error accessing electron.app:', e);
}

if (electron.app) {
    console.log('Exiting...');
    // We don't want to actually quit if we are just testing the require, 
    // but in a real electron app we control the lifecycle.
    // Just finding out what 'electron' is is enough.
    electron.app.quit();
}
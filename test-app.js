const electron = require('electron');
console.log('Type of electron:', typeof electron);
console.log('Keys:', Object.keys(electron));
try {
  const { app } = electron;
  console.log('App:', app);
  app.quit();
} catch (e) {
  console.error(e);
}
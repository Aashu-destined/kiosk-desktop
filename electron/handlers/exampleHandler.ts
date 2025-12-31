import { app } from 'electron';

/**
 * An example handler that demonstrates a simple, read-only IPC operation.
 * It safely retrieves the application's version from the main process.
 * @returns A promise that resolves to an object containing the success status and the app version.
 */
export const handleGetAppVersion = async () => {
  try {
    // app.getVersion() is a safe Electron API that reads the version from package.json
    const version = app.getVersion();
    return { success: true, version };
  } catch (error) {
    console.error('Failed to get app version:', error);
    return { success: false, error: 'Could not retrieve app version.' };
  }
};

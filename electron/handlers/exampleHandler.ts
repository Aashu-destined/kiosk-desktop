import { app } from 'electron';
import { handleIpcRequest } from '../utils/ipcHelper';

/**
 * An example handler that demonstrates a simple, read-only IPC operation.
 * It safely retrieves the application's version from the main process.
 * @returns A promise that resolves to an object containing the success status and the app version.
 */
export const handleGetAppVersion = async () => {
  return handleIpcRequest(() => {
    // app.getVersion() is a safe Electron API that reads the version from package.json
    const version = app.getVersion();
    return { version };
  });
};

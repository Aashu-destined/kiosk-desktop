import { IpcResponse } from '../../src/types/ipcResponse';

export const createSuccessResponse = <T>(data: T): IpcResponse<T> => ({
    success: true,
    data
});

export const createErrorResponse = (error: any): IpcResponse<null> => {
    let code = 'UNKNOWN_ERROR';
    let message = 'An unexpected error occurred';
    let details = undefined;

    if (error instanceof Error) {
        message = error.message;
        // SQLite Constraints
        if (message.includes('UNIQUE constraint failed')) {
            code = 'DUPLICATE_ENTRY';
        } else if (message.includes('FOREIGN KEY constraint failed')) {
            code = 'INVALID_REFERENCE';
        }
        
        // Check for custom code property
        if ((error as any).code) {
             if ((error as any).code === 'SQLITE_CONSTRAINT_UNIQUE') {
                 code = 'DUPLICATE_ENTRY';
             } else {
                 code = (error as any).code;
             }
        }
    } else if (typeof error === 'string') {
        message = error;
    }

    return {
        success: false,
        error: {
            code,
            message,
            details
        }
    };
};

export const handleIpcRequest = async <T>(
    handler: () => Promise<T> | T
): Promise<IpcResponse<T>> => {
    try {
        const data = await handler();
        return createSuccessResponse(data);
    } catch (error) {
        console.error('IPC Handler Error:', error);
        // Cast to any to satisfy the generic return type requirement in a simple way
        // or return as IpcResponse<any>
        return createErrorResponse(error) as any;
    }
};
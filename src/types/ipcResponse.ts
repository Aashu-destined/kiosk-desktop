export interface IpcError {
    code: string;
    message: string;
    details?: any;
}

export interface IpcResponse<T> {
    success: boolean;
    data?: T;
    error?: IpcError;
}

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
            // Map common SQLite codes if needed, or use as is
             if ((error as any).code === 'SQLITE_CONSTRAINT_UNIQUE') {
                 code = 'DUPLICATE_ENTRY';
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
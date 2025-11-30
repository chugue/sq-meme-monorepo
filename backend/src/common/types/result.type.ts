export type Result<T> =
    | { success: true; data: T }
    | { success: false; errorMessage: string };

export const Result = {
    ok: <T>(data: T): Result<T> => ({ success: true, data }),
    fail: <T>(errorMessage: string): Result<T> => ({ success: false, errorMessage }),
};

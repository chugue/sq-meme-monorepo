export type Result<T> = {
    success: true;
    data: T;
} | {
    success: false;
    errorMessage: string;
};
export declare const Result: {
    ok: <T>(data: T) => Result<T>;
    fail: <T>(errorMessage: string) => Result<T>;
};

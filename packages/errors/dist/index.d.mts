import { NextResponse } from 'next/server';

declare class ApiError extends Error {
    statusCode: number;
    code?: string | undefined;
    constructor(statusCode: number, message: string, code?: string | undefined);
}
declare const createErrorResponse: (error: unknown, fallbackMessage?: string) => NextResponse<{
    success: boolean;
    message: string;
}>;
declare const notFound: (resource: string) => ApiError;
declare const badRequest: (message: string) => ApiError;
declare const unauthorized: () => ApiError;
declare const forbidden: () => ApiError;

export { ApiError, badRequest, createErrorResponse, forbidden, notFound, unauthorized };

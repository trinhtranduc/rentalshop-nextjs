/** #907 Small response helpers shared by the attendance routes. */
import { NextResponse } from 'next/server';
import { ResponseBuilder } from '@rentalshop/utils';

export function attendanceError(code: string, status: number, data?: Record<string, unknown>) {
  const body = ResponseBuilder.error(code);
  return NextResponse.json(data ? { ...body, data } : body, { status });
}

export function attendanceOk(code: string, data: unknown) {
  return NextResponse.json(ResponseBuilder.success(code, data));
}

type FlatError = Parameters<typeof ResponseBuilder.validationError>[0];

export function validationFailed(error: { flatten: () => FlatError }) {
  return NextResponse.json(ResponseBuilder.validationError(error.flatten()), { status: 400 });
}

/** Thrown inside a route to answer an error from a helper; caught by `respondAttendanceError`. */
export class AttendanceHttpError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    public readonly data?: Record<string, unknown>
  ) {
    super(code);
  }
}

export function asAttendanceErrorResponse(error: unknown) {
  return error instanceof AttendanceHttpError ? attendanceError(error.code, error.status, error.data) : null;
}

import { NextResponse } from "next/server";

export type ApiStatus = "success" | "error";

export type ApiFieldError = {
  field: string;
  message: string;
};

export type ApiEnvelope<T> = {
  status: ApiStatus;
  code: number;
  message: string;
  timestamp: string;
  data: T | null;
  errors?: ApiFieldError[];
};

export function isoNow() {
  return new Date().toISOString();
}

export function ok<T>(
  data: T,
  message = "OK",
  code = 200,
  init?: ResponseInit,
) {
  const body: ApiEnvelope<T> = {
    status: "success",
    code,
    message,
    timestamp: isoNow(),
    data,
  };
  return NextResponse.json(body, { status: code, ...init });
}

export function created<T>(data: T, message = "Created", init?: ResponseInit) {
  return ok(data, message, 201, init);
}

export function err(
  message: string,
  code = 400,
  errors?: ApiFieldError[],
  init?: ResponseInit,
) {
  const body: ApiEnvelope<null> = {
    status: "error",
    code,
    message,
    timestamp: isoNow(),
    data: null,
    ...(errors && errors.length ? { errors } : {}),
  };
  return NextResponse.json(body, { status: code, ...init });
}


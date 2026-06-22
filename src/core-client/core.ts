/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

export interface CoreError {
  code: string;
  message: string;
  details: unknown | null;
  retryable: boolean;
}

export function toCoreError(value: unknown): CoreError {
  const candidate = value as Partial<CoreError> | null;
  if (candidate && typeof candidate.code === "string" && typeof candidate.message === "string") {
    return {
      code: candidate.code,
      message: candidate.message,
      details: candidate.details ?? null,
      retryable: candidate.retryable === true,
    };
  }

  return {
    code: "unknown",
    message: value instanceof Error ? value.message : String(value),
    details: null,
    retryable: false,
  };
}

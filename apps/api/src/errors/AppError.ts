export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'EMAIL_EXISTS'
  | 'CAMPAIGN_NOT_DRAFT'
  | 'CAMPAIGN_ALREADY_SENT'
  | 'CAMPAIGN_IN_FLIGHT'
  | 'NO_RECIPIENTS'
  | 'INVALID_SCHEDULE'
  | 'INTERNAL';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: string, status: number, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
    this.name = 'AppError';
  }

  static badRequest(code: ErrorCode, message: string, details?: unknown) {
    return new AppError(code, message, 400, details);
  }
  static unauthorized(message = 'Authentication required') {
    return new AppError('UNAUTHORIZED', message, 401);
  }
  static forbidden(message = 'Forbidden') {
    return new AppError('FORBIDDEN', message, 403);
  }
  static notFound(message = 'Not found') {
    return new AppError('NOT_FOUND', message, 404);
  }
  static conflict(code: ErrorCode, message: string, details?: unknown) {
    return new AppError(code, message, 409, details);
  }
}

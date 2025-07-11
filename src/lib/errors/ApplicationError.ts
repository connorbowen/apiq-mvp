export class ApplicationError extends Error {
  public readonly status: number;
  public readonly code?: string;

  constructor(message: string, status = 500, code?: string) {
    super(message);
    this.name = 'ApplicationError';
    this.status = status;
    this.code = code;
  }
}

// Convenience builders for common error types
export const badRequest = (message: string, code?: string) => 
  new ApplicationError(message, 400, code);

export const unauthorized = (message: string, code?: string) => 
  new ApplicationError(message, 401, code);

export const forbidden = (message: string, code?: string) => 
  new ApplicationError(message, 403, code);

export const notFound = (message: string, code?: string) => 
  new ApplicationError(message, 404, code);

export const conflict = (message: string, code?: string) => 
  new ApplicationError(message, 409, code);

export const tooManyRequests = (message: string, code?: string) => 
  new ApplicationError(message, 429, code);

export const internalServerError = (message: string, code?: string) => 
  new ApplicationError(message, 500, code); 
import { ApplicationError } from './ApplicationError';
export { ApplicationError };

export const unauthenticated = (msg = 'Authentication required') =>
  new ApplicationError(msg, 401, 'UNAUTHENTICATED');

export const forbidden = (msg = 'Forbidden') =>
  new ApplicationError(msg, 403, 'FORBIDDEN'); 
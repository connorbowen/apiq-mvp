import { handleRefreshToken } from '../../../src/lib/auth/session';
import { errorHandler } from '../../../src/middleware/errorHandler';

export default errorHandler(handleRefreshToken); 
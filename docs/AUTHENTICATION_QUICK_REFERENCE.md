# Authentication Quick Reference

## 🔐 Custom JWT Authentication System

### **Environment Variables**
```bash
# Required
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Optional (for development)
NODE_ENV=development
```

### **API Endpoints**
```bash
# Authentication
POST /api/auth/login          # User login
POST /api/auth/register       # User registration
GET  /api/auth/me            # Get current user
POST /api/auth/refresh       # Refresh JWT token
POST /api/auth/logout        # User logout

# Password Management
POST /api/auth/forgot-password    # Request password reset
POST /api/auth/reset-password     # Reset password
POST /api/auth/verify            # Email verification
```

### **User Roles**
```typescript
enum Role {
  USER = 'USER',           // Standard user
  ADMIN = 'ADMIN',         // Admin user
  SUPER_ADMIN = 'SUPER_ADMIN'  // Super admin
}
```

### **JWT Token Structure**
```typescript
interface JWTPayload {
  userId: string;          // User ID
  type: 'access' | 'refresh';  // Token type
  iat: number;            // Issued at
  exp: number;            // Expires at
}
```

### **Authentication Flow**
1. **Login**: User provides email/password
2. **Validation**: Server validates credentials
3. **Token Generation**: JWT access + refresh tokens created
4. **Cookie Setting**: Tokens stored in HTTP-only cookies
5. **Authorization**: Tokens validated on protected routes

### **Frontend Usage**
```typescript
// Get current user
const response = await apiClient.getCurrentUser();
if (response.success) {
  const user = response.data.user;
  // User is authenticated
}

// Check authentication status
const isAuthenticated = !!user;
const userRole = user?.role;
```

### **Backend Usage**
```typescript
// Require authentication
const user = await requireAuth(req, res);

// Check user role
if (user.role === 'SUPER_ADMIN') {
  // Super admin access
}

// Generate tokens
const accessToken = generateToken(userId, 'access');
const refreshToken = generateToken(userId, 'refresh');
```

### **Security Features**
- **HTTP-Only Cookies**: Prevents XSS attacks
- **JWT Expiration**: Configurable token expiration
- **Password Hashing**: bcrypt with salt rounds
- **Role-Based Access**: Granular permission control
- **Token Refresh**: Automatic session renewal

### **Error Handling**
```typescript
// Common error codes
UNAUTHENTICATED    // User not logged in
FORBIDDEN         // Insufficient permissions
INVALID_CREDENTIALS // Wrong email/password
TOKEN_EXPIRED     // JWT token expired
```

### **Testing**
```bash
# Run authentication tests
npm run test:e2e:auth

# Run specific test suites
npm run test:e2e:auth:session      # Session management
npm run test:e2e:auth:registration # Registration flow
npm run test:e2e:auth:landing      # Landing page behavior
```

### **Migration Notes**
- **NextAuth Removed**: No longer using NextAuth
- **Custom JWT Only**: Single authentication system
- **Backward Compatible**: All existing functionality preserved
- **Better Performance**: Faster authentication without external dependencies

### **Troubleshooting**
1. **JWT Validation Errors**: Check `JWT_SECRET` environment variable
2. **Authentication Failures**: Verify cookie settings and domain
3. **Test Failures**: Some intermittent failures are timing-related
4. **Token Issues**: Ensure proper JWT format and expiration

### **Production Checklist**
- [ ] Set `JWT_SECRET` in production environment
- [ ] Configure `JWT_EXPIRES_IN` for your security requirements
- [ ] Test all authentication flows
- [ ] Monitor authentication performance
- [ ] Update team documentation

---

**Need Help?** See [AUTHENTICATION_MIGRATION_SUMMARY.md](AUTHENTICATION_MIGRATION_SUMMARY.md) for detailed migration information.

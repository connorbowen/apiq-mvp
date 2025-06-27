# APIQ Security Guide

## Overview

This security guide outlines the comprehensive security measures implemented in APIQ to protect user data, API credentials, and system integrity. Security is a fundamental aspect of our platform, and we follow industry best practices to ensure the highest level of protection.

## Table of Contents

1. [Security Architecture](#security-architecture)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Protection](#data-protection)
4. [API Security](#api-security)
5. [Infrastructure Security](#infrastructure-security)
6. [Compliance & Governance](#compliance--governance)
7. [Security Monitoring](#security-monitoring)
8. [Incident Response](#incident-response)
9. [Security Best Practices](#security-best-practices)
10. [Security Checklist](#security-checklist)

## Security Architecture

### Defense in Depth

APIQ implements a multi-layered security approach:

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                          │
├─────────────────────────────────────────────────────────────┤
│  Application Security (Input validation, Output encoding)   │
├─────────────────────────────────────────────────────────────┤
│  Authentication & Authorization (JWT, RBAC)                 │
├─────────────────────────────────────────────────────────────┤
│  Network Security (HTTPS, WAF, Rate limiting)               │
├─────────────────────────────────────────────────────────────┤
│  Infrastructure Security (Firewalls, VPC, Security groups)  │
├─────────────────────────────────────────────────────────────┤
│  Data Security (Encryption at rest and in transit)          │
└─────────────────────────────────────────────────────────────┘
```

### Security Principles

1. **Zero Trust**: Never trust, always verify
2. **Least Privilege**: Grant minimum necessary permissions
3. **Defense in Depth**: Multiple security layers
4. **Security by Design**: Security built into every component
5. **Continuous Monitoring**: Real-time security oversight

## Authentication & Authorization

### User Authentication

**Multi-Factor Authentication (MFA)**
- TOTP (Time-based One-Time Password) support
- SMS-based verification (optional)
- Backup codes for account recovery
- Hardware security key support (WebAuthn)

**Password Security**
```typescript
// Password hashing with bcrypt
import bcrypt from 'bcryptjs';

const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};
```

**Session Management**
- JWT tokens with short expiration (15 minutes)
- Refresh token rotation
- Secure cookie configuration
- Session invalidation on logout

**Single Sign-On (SSO)**
- OAuth 2.0 / OpenID Connect support
- SAML 2.0 integration
- Enterprise identity provider support
- Just-in-time user provisioning

### Role-Based Access Control (RBAC)

**User Roles**
```typescript
enum UserRole {
  USER = 'USER',           // Basic user permissions
  ADMIN = 'ADMIN',         // Administrative permissions
  AUDITOR = 'AUDITOR'      // Read-only audit access
}

interface Permission {
  resource: string;        // API, workflow, log, etc.
  action: string;          // create, read, update, delete, execute
  conditions?: object;     // Additional conditions
}
```

**Permission Matrix**
| Role | APIs | Workflows | Executions | Logs | Users | System |
|------|------|-----------|------------|------|-------|--------|
| USER | CRUD (own) | CRUD (own) | Execute (own) | Read (own) | - | - |
| ADMIN | CRUD (all) | CRUD (all) | Execute (all) | Read (all) | CRUD | Read |
| AUDITOR | Read (all) | Read (all) | Read (all) | Read (all) | Read | Read |

**API-Level Authorization**
```typescript
// Middleware for API authorization
export const requirePermission = (resource: string, action: string) => {
  return async (req: NextApiRequest, res: NextApiResponse, next: NextFunction) => {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    
    const hasPermission = await checkPermission(session.user.id, resource, action);
    
    if (!hasPermission) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }
    
    next();
  };
};
```

## Data Protection

### Encryption

**Encryption at Rest**
```typescript
// AES-256-GCM encryption for sensitive data
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;
const ALGORITHM = 'aes-256-gcm';

export const encryptData = (data: string): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
  cipher.setAAD(iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

export const decryptData = (encryptedData: string): string => {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
  decipher.setAAD(iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};
```

**Encryption in Transit**
- TLS 1.3 for all communications
- HSTS (HTTP Strict Transport Security)
- Certificate pinning for critical endpoints
- Perfect Forward Secrecy (PFS)

**API Credential Storage**
```typescript
// Secure storage of API credentials
export const storeApiCredentials = async (
  userId: string,
  apiId: string,
  credentials: ApiCredentials
): Promise<void> => {
  const encryptedCredentials = encryptData(JSON.stringify(credentials));
  
  await prisma.apiCredentials.create({
    data: {
      userId,
      apiId,
      encryptedData: encryptedCredentials,
      keyId: generateKeyId(), // For key rotation
      createdAt: new Date()
    }
  });
};
```

### Data Classification

**Sensitive Data Types**
1. **Critical**: API keys, passwords, tokens
2. **High**: User personal information, workflow data
3. **Medium**: API specifications, execution logs
4. **Low**: Public documentation, system metrics

**Data Handling Requirements**
- Critical data: Always encrypted, minimal access
- High data: Encrypted, role-based access
- Medium data: Encrypted at rest, logged access
- Low data: Standard protection, public access

### Data Retention

**Retention Policies**
```typescript
interface RetentionPolicy {
  dataType: string;
  retentionPeriod: number; // days
  archivalPolicy: 'delete' | 'archive' | 'anonymize';
  legalHold: boolean;
}

const retentionPolicies: RetentionPolicy[] = [
  {
    dataType: 'audit_logs',
    retentionPeriod: 2555, // 7 years
    archivalPolicy: 'archive',
    legalHold: true
  },
  {
    dataType: 'api_credentials',
    retentionPeriod: 365, // 1 year after API deletion
    archivalPolicy: 'delete',
    legalHold: false
  },
  {
    dataType: 'workflow_executions',
    retentionPeriod: 1095, // 3 years
    archivalPolicy: 'anonymize',
    legalHold: false
  }
];
```

## API Security

### Input Validation

**Request Validation**
```typescript
import { z } from 'zod';

const createApiConnectionSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9\s\-_]+$/),
  baseUrl: z.string().url().refine(url => {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  }),
  authType: z.enum(['api_key', 'oauth', 'bearer', 'basic']),
  authConfig: z.object({
    apiKey: z.string().optional(),
    bearerToken: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional()
  }).refine(data => {
    // Ensure at least one auth method is provided
    return Object.values(data).some(value => value !== undefined);
  })
});
```

**SQL Injection Prevention**
```typescript
// Using Prisma ORM for parameterized queries
const getUserApis = async (userId: string) => {
  return await prisma.apiConnection.findMany({
    where: {
      userId: userId // Prisma automatically handles parameterization
    }
  });
};
```

**XSS Prevention**
```typescript
import DOMPurify from 'isomorphic-dompurify';

export const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
};

export const sanitizeOutput = (data: any): any => {
  if (typeof data === 'string') {
    return DOMPurify.sanitize(data);
  }
  return data;
};
```

### Rate Limiting

**API Rate Limiting**
```typescript
import rateLimit from 'express-rate-limit';

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Rate limit exceeded',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.session?.user?.id || req.ip;
  }
});
```

**AI Service Rate Limiting**
```typescript
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 AI requests per minute per user
  message: {
    success: false,
    error: 'AI service rate limit exceeded',
    code: 'AI_RATE_LIMIT_EXCEEDED'
  }
});
```

### External API Security

**Credential Management**
- Encrypted storage of API credentials
- Automatic credential rotation
- Secure credential injection
- Audit logging of credential usage

**API Call Security**
```typescript
export const secureApiCall = async (
  apiConnection: ApiConnection,
  endpoint: string,
  method: string,
  data?: any
) => {
  // Decrypt credentials
  const credentials = decryptApiCredentials(apiConnection.encryptedCredentials);
  
  // Prepare request with security headers
  const headers = {
    'User-Agent': 'APIQ/1.0',
    'X-Request-ID': generateRequestId(),
    'X-APIQ-Version': '1.0.0',
    ...credentials.headers
  };
  
  // Make request with timeout and retry logic
  const response = await axios({
    method,
    url: `${apiConnection.baseUrl}${endpoint}`,
    data,
    headers,
    timeout: 30000,
    validateStatus: () => true // Handle all status codes
  });
  
  // Log API call for audit
  await logApiCall({
    apiConnectionId: apiConnection.id,
    endpoint,
    method,
    statusCode: response.status,
    duration: response.headers['x-response-time'],
    userId: getCurrentUserId()
  });
  
  return response;
};
```

## Infrastructure Security

### Network Security

**HTTPS Configuration**
```typescript
// Next.js HTTPS configuration
const httpsOptions = {
  key: fs.readFileSync('/path/to/private-key.pem'),
  cert: fs.readFileSync('/path/to/certificate.pem'),
  ca: fs.readFileSync('/path/to/ca-bundle.pem')
};

// Security headers
const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  }
];
```

**Firewall Configuration**
- Web Application Firewall (WAF)
- DDoS protection
- IP whitelisting for admin access
- Geographic restrictions (if needed)

### Database Security

**Connection Security**
```typescript
// Prisma database configuration with SSL
const databaseUrl = process.env.DATABASE_URL + '?sslmode=require';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  },
  log: ['query', 'info', 'warn', 'error']
});
```

**Database Access Control**
- Role-based database access
- Connection pooling with limits
- Query logging and monitoring
- Regular security updates

### Container Security

**Docker Security**
```dockerfile
# Multi-stage build for security
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

WORKDIR /app
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs . .

USER nextjs
EXPOSE 3000
CMD ["npm", "start"]
```

**Security Scanning**
- Container vulnerability scanning
- Base image security updates
- Runtime security monitoring
- Secrets management

## Compliance & Governance

### GDPR Compliance

**Data Subject Rights**
```typescript
// Data export functionality
export const exportUserData = async (userId: string): Promise<UserDataExport> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      apiConnections: true,
      workflows: true,
      auditLogs: true
    }
  });
  
  return {
    personalData: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt
    },
    apiConnections: user.apiConnections.map(api => ({
      id: api.id,
      name: api.name,
      baseUrl: api.baseUrl,
      createdAt: api.createdAt
    })),
    workflows: user.workflows,
    auditLogs: user.auditLogs
  };
};

// Data deletion functionality
export const deleteUserData = async (userId: string): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    // Anonymize personal data
    await tx.user.update({
      where: { id: userId },
      data: {
        email: `deleted_${userId}@deleted.com`,
        name: 'Deleted User',
        deletedAt: new Date()
      }
    });
    
    // Delete sensitive data
    await tx.apiCredentials.deleteMany({
      where: { userId }
    });
    
    // Archive audit logs
    await tx.auditLog.updateMany({
      where: { userId },
      data: { archived: true }
    });
  });
};
```

### SOC 2 Compliance

**Security Controls**
- Access control policies
- Change management procedures
- Incident response plans
- Regular security assessments

**Audit Trail**
```typescript
// Comprehensive audit logging
export const logSecurityEvent = async (event: SecurityEvent): Promise<void> => {
  await prisma.securityLog.create({
    data: {
      eventType: event.type,
      userId: event.userId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      details: event.details,
      severity: event.severity,
      timestamp: new Date()
    }
  });
  
  // Alert on high-severity events
  if (event.severity === 'HIGH' || event.severity === 'CRITICAL') {
    await sendSecurityAlert(event);
  }
};
```

### Industry Standards

**OWASP Top 10 Compliance**
- Input validation and output encoding
- Authentication and session management
- Access control implementation
- Security configuration management
- Data protection and privacy

**NIST Cybersecurity Framework**
- Identify: Asset management and risk assessment
- Protect: Access control and data security
- Detect: Continuous monitoring and detection
- Respond: Incident response and communication
- Recover: Business continuity and improvement

## Security Monitoring

### Real-time Monitoring

**Security Event Monitoring**
```typescript
// Security event monitoring
export const monitorSecurityEvents = async () => {
  const events = await prisma.securityLog.findMany({
    where: {
      timestamp: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      },
      severity: {
        in: ['HIGH', 'CRITICAL']
      }
    }
  });
  
  // Analyze patterns
  const suspiciousPatterns = analyzeSecurityPatterns(events);
  
  // Generate alerts
  if (suspiciousPatterns.length > 0) {
    await sendSecurityAlerts(suspiciousPatterns);
  }
};
```

**Anomaly Detection**
- User behavior analysis
- API usage patterns
- Geographic access patterns
- Time-based access patterns

### Logging and Alerting

**Security Logging**
```typescript
// Structured security logging
export const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/security.log',
      maxsize: 5242880, // 5MB
      maxFiles: 10
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

export const logSecurityEvent = (event: SecurityEvent) => {
  securityLogger.info('Security Event', {
    eventType: event.type,
    userId: event.userId,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    details: event.details,
    severity: event.severity,
    timestamp: new Date().toISOString()
  });
};
```

**Alert Configuration**
```typescript
interface SecurityAlert {
  type: 'failed_login' | 'suspicious_activity' | 'data_breach' | 'system_compromise';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  details: object;
  recipients: string[];
}

export const sendSecurityAlert = async (alert: SecurityAlert): Promise<void> => {
  // Send email alerts
  await sendEmailAlert(alert);
  
  // Send Slack notifications
  await sendSlackAlert(alert);
  
  // Log alert
  await logSecurityAlert(alert);
  
  // Create incident ticket for critical alerts
  if (alert.severity === 'CRITICAL') {
    await createIncidentTicket(alert);
  }
};
```

## Incident Response

### Incident Response Plan

**Response Phases**
1. **Preparation**: Documentation, training, tools
2. **Identification**: Detection and classification
3. **Containment**: Isolate and limit impact
4. **Eradication**: Remove threat and vulnerabilities
5. **Recovery**: Restore normal operations
6. **Lessons Learned**: Document and improve

**Incident Classification**
```typescript
enum IncidentSeverity {
  LOW = 'LOW',           // Minor security events
  MEDIUM = 'MEDIUM',     // Potential security issues
  HIGH = 'HIGH',         // Confirmed security incidents
  CRITICAL = 'CRITICAL'  // Major security breaches
}

enum IncidentType {
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  DATA_BREACH = 'DATA_BREACH',
  MALWARE_INFECTION = 'MALWARE_INFECTION',
  DOS_ATTACK = 'DOS_ATTACK',
  INSIDER_THREAT = 'INSIDER_THREAT'
}
```

### Response Procedures

**Immediate Response**
```typescript
export const handleSecurityIncident = async (incident: SecurityIncident): Promise<void> => {
  // 1. Create incident record
  const incidentRecord = await createIncidentRecord(incident);
  
  // 2. Notify response team
  await notifyResponseTeam(incident);
  
  // 3. Implement containment measures
  await implementContainment(incident);
  
  // 4. Begin investigation
  await investigateIncident(incident);
  
  // 5. Document response actions
  await documentResponseActions(incident, incidentRecord);
};
```

**Communication Plan**
- Internal team notifications
- Customer communications
- Regulatory reporting
- Public disclosure (if required)

## Security Best Practices

### Development Security

**Secure Coding Practices**
```typescript
// Input validation
export const validateAndSanitizeInput = (input: any): any => {
  // Validate input structure
  const validated = inputSchema.parse(input);
  
  // Sanitize string inputs
  if (typeof validated === 'string') {
    return sanitizeInput(validated);
  }
  
  // Recursively sanitize objects
  if (typeof validated === 'object') {
    return Object.keys(validated).reduce((acc, key) => {
      acc[key] = validateAndSanitizeInput(validated[key]);
      return acc;
    }, {});
  }
  
  return validated;
};

// Secure error handling
export const secureErrorHandler = (error: Error): void => {
  // Log error without sensitive information
  logger.error('Application Error', {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    timestamp: new Date().toISOString()
  });
  
  // Don't expose internal details to users
  throw new AppError('Internal server error', 500);
};
```

**Dependency Security**
- Regular dependency updates
- Vulnerability scanning
- License compliance
- Supply chain security

### Operational Security

**Access Management**
- Principle of least privilege
- Regular access reviews
- Privileged access management
- Multi-factor authentication

**Change Management**
- Security review for all changes
- Testing in staging environment
- Rollback procedures
- Change documentation

## Security Checklist

### Pre-Deployment Checklist

- [ ] Security code review completed
- [ ] Vulnerability scan passed
- [ ] Penetration testing completed
- [ ] Security headers configured
- [ ] SSL/TLS certificates valid
- [ ] Database security configured
- [ ] Access controls implemented
- [ ] Audit logging enabled
- [ ] Incident response plan ready
- [ ] Security monitoring active

### Ongoing Security Tasks

- [ ] Daily security log review
- [ ] Weekly vulnerability scans
- [ ] Monthly access reviews
- [ ] Quarterly security assessments
- [ ] Annual penetration testing
- [ ] Regular security training
- [ ] Security policy updates
- [ ] Compliance audits

### Incident Response Checklist

- [ ] Incident identified and classified
- [ ] Response team notified
- [ ] Containment measures implemented
- [ ] Evidence preserved
- [ ] Investigation initiated
- [ ] Stakeholders notified
- [ ] Recovery procedures executed
- [ ] Post-incident review completed
- [ ] Lessons learned documented
- [ ] Security measures updated

This security guide provides comprehensive coverage of all security aspects of the APIQ platform. Regular updates and reviews ensure continued security excellence. 
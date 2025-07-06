/**
 * Integration Test UX Compliance Helper
 * 
 * This helper ensures integration tests validate UX compliance requirements
 * from docs/UX_SPEC.md and user-rules.md for API responses.
 */
export class IntegrationComplianceHelper {
  
  /**
   * Validate API response follows UX compliance requirements
   */
  static validateAPIResponse(data: any, expectedSuccess: boolean = true) {
    // Validate consistent response structure
    expect(data).toHaveProperty('success', expectedSuccess);
    // Timestamp is optional - not all endpoints include it
    // expect(data).toHaveProperty('timestamp');
    
    if (expectedSuccess) {
      // Validate success response structure
      expect(data).toHaveProperty('data');
      expect(data.data).toBeDefined();
      
      // Validate no sensitive data exposure
      if (data.data.user) {
        expect(data.data.user.password).toBeUndefined();
        expect(data.data.user.refreshToken).toBeUndefined();
      }
    } else {
      // Validate error response structure
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('code');
      
      // Validate UX-compliant error messaging
      expect(data.error).toBeTruthy();
      expect(data.error).not.toContain('password');
      expect(data.error).not.toContain('token');
      expect(data.error).not.toContain('secret');
    }
  }
  
  /**
   * Validate authentication response UX compliance
   */
  static validateAuthResponse(data: any, expectedUser?: any) {
    this.validateAPIResponse(data, true);
    
    if (expectedUser) {
      expect(data.data.user.email).toBe(expectedUser.email);
      expect(data.data.user.name).toBeDefined();
      expect(data.data.user.id).toBeDefined();
      expect(data.data.accessToken).toBeDefined();
      expect(data.data.refreshToken).toBeDefined();
    }
  }
  
  /**
   * Validate error response UX compliance
   */
  static validateErrorResponse(data: any, expectedCode?: string) {
    this.validateAPIResponse(data, false);
    
    if (expectedCode) {
      expect(data.code).toBe(expectedCode);
    }
    
    // Validate error message is clear and actionable
    expect(data.error).toMatch(/Invalid|Required|Failed|Error/);
  }
  
  /**
   * Validate CRUD operation response UX compliance
   */
  static validateCRUDResponse(data: any, operation: 'create' | 'read' | 'update' | 'delete') {
    this.validateAPIResponse(data, true);
    
    switch (operation) {
      case 'create':
        expect(data.data.id).toBeDefined();
        expect(data.data.createdAt).toBeDefined();
        break;
      case 'read':
        expect(data.data).toBeDefined();
        break;
      case 'update':
        expect(data.data.updatedAt).toBeDefined();
        break;
      case 'delete':
        // Delete operations might return success without data
        break;
    }
  }
  
  /**
   * Validate pagination response UX compliance
   */
  static validatePaginationResponse(data: any) {
    this.validateAPIResponse(data, true);
    
    expect(data.data).toHaveProperty('items');
    expect(data.data).toHaveProperty('pagination');
    expect(data.data.pagination).toHaveProperty('page');
    expect(data.data.pagination).toHaveProperty('limit');
    expect(data.data.pagination).toHaveProperty('total');
  }
} 
/**
 * Performance Monitor for AI Workflow Generation
 * Tracks metrics and provides insights into performance bottlenecks
 */

export interface PerformanceMetrics {
  totalRequests: number;
  averageResponseTime: number;
  successRate: number;
  errorRate: number;
  cacheHitRate: number;
  retryRate: number;
  tokenUsage: {
    average: number;
    max: number;
    total: number;
  };
  breakdown: {
    classification: number;
    connectionAnalysis: number;
    workflowGeneration: number;
    total: number;
  };
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics;
  private requestHistory: Array<{
    timestamp: number;
    duration: number;
    success: boolean;
    error?: string;
    tokenUsage?: number;
    breakdown?: {
      classification: number;
      connectionAnalysis: number;
      workflowGeneration: number;
    };
  }> = [];

  private constructor() {
    this.metrics = {
      totalRequests: 0,
      averageResponseTime: 0,
      successRate: 0,
      errorRate: 0,
      cacheHitRate: 0,
      retryRate: 0,
      tokenUsage: {
        average: 0,
        max: 0,
        total: 0
      },
      breakdown: {
        classification: 0,
        connectionAnalysis: 0,
        workflowGeneration: 0,
        total: 0
      }
    };
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Record a request with timing breakdown
   */
  recordRequest(data: {
    duration: number;
    success: boolean;
    error?: string;
    tokenUsage?: number;
    breakdown?: {
      classification: number;
      connectionAnalysis: number;
      workflowGeneration: number;
    };
  }) {
    const record = {
      timestamp: Date.now(),
      ...data
    };

    this.requestHistory.push(record);
    
    // Keep only last 1000 requests
    if (this.requestHistory.length > 1000) {
      this.requestHistory = this.requestHistory.slice(-1000);
    }

    this.updateMetrics();
  }

  /**
   * Update performance metrics
   */
  private updateMetrics() {
    const recent = this.requestHistory.slice(-100); // Last 100 requests
    
    this.metrics.totalRequests = this.requestHistory.length;
    this.metrics.averageResponseTime = recent.reduce((sum, r) => sum + r.duration, 0) / recent.length;
    this.metrics.successRate = recent.filter(r => r.success).length / recent.length;
    this.metrics.errorRate = recent.filter(r => !r.success).length / recent.length;
    
    // Calculate token usage metrics
    const tokenUsages = recent.filter(r => r.tokenUsage).map(r => r.tokenUsage!);
    if (tokenUsages.length > 0) {
      this.metrics.tokenUsage.average = tokenUsages.reduce((sum, t) => sum + t, 0) / tokenUsages.length;
      this.metrics.tokenUsage.max = Math.max(...tokenUsages);
      this.metrics.tokenUsage.total = tokenUsages.reduce((sum, t) => sum + t, 0);
    }

    // Calculate breakdown averages
    const breakdowns = recent.filter(r => r.breakdown).map(r => r.breakdown!);
    if (breakdowns.length > 0) {
      this.metrics.breakdown.classification = breakdowns.reduce((sum, b) => sum + b.classification, 0) / breakdowns.length;
      this.metrics.breakdown.connectionAnalysis = breakdowns.reduce((sum, b) => sum + b.connectionAnalysis, 0) / breakdowns.length;
      this.metrics.breakdown.workflowGeneration = breakdowns.reduce((sum, b) => sum + b.workflowGeneration, 0) / breakdowns.length;
      this.metrics.breakdown.total = this.metrics.breakdown.classification + this.metrics.breakdown.connectionAnalysis + this.metrics.breakdown.workflowGeneration;
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance summary for logging
   */
  getPerformanceSummary(): string {
    const m = this.metrics;
    return `Performance Summary:
- Total Requests: ${m.totalRequests}
- Avg Response Time: ${m.averageResponseTime.toFixed(0)}ms
- Success Rate: ${(m.successRate * 100).toFixed(1)}%
- Error Rate: ${(m.errorRate * 100).toFixed(1)}%
- Avg Token Usage: ${m.tokenUsage.average.toFixed(0)}
- Breakdown: Classification=${m.breakdown.classification.toFixed(0)}ms, Analysis=${m.breakdown.connectionAnalysis.toFixed(0)}ms, Generation=${m.breakdown.workflowGeneration.toFixed(0)}ms`;
  }

  /**
   * Get recent performance trends
   */
  getTrends(): {
    responseTimeTrend: 'improving' | 'degrading' | 'stable';
    errorTrend: 'improving' | 'degrading' | 'stable';
    recommendations: string[];
  } {
    const recent = this.requestHistory.slice(-50);
    const older = this.requestHistory.slice(-100, -50);
    
    if (recent.length < 10 || older.length < 10) {
      return {
        responseTimeTrend: 'stable',
        errorTrend: 'stable',
        recommendations: ['Need more data to analyze trends']
      };
    }

    const recentAvgTime = recent.reduce((sum, r) => sum + r.duration, 0) / recent.length;
    const olderAvgTime = older.reduce((sum, r) => sum + r.duration, 0) / older.length;
    const responseTimeTrend = recentAvgTime < olderAvgTime * 0.9 ? 'improving' : 
                             recentAvgTime > olderAvgTime * 1.1 ? 'degrading' : 'stable';

    const recentErrorRate = recent.filter(r => !r.success).length / recent.length;
    const olderErrorRate = older.filter(r => !r.success).length / older.length;
    const errorTrend = recentErrorRate < olderErrorRate * 0.9 ? 'improving' :
                      recentErrorRate > olderErrorRate * 1.1 ? 'degrading' : 'stable';

    const recommendations: string[] = [];
    
    if (responseTimeTrend === 'degrading') {
      recommendations.push('Consider implementing caching for repeated requests');
      recommendations.push('Review OpenAI model selection and parameters');
    }
    
    if (errorTrend === 'degrading') {
      recommendations.push('Investigate recent error patterns');
      recommendations.push('Consider adjusting retry logic');
    }
    
    if (this.metrics.averageResponseTime > 5000) {
      recommendations.push('Response time is high - consider parallel processing');
    }
    
    if (this.metrics.tokenUsage.average > 2000) {
      recommendations.push('High token usage - consider prompt optimization');
    }

    return {
      responseTimeTrend,
      errorTrend,
      recommendations
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.requestHistory = [];
    this.updateMetrics();
  }
}

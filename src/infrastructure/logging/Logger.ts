import pino from 'pino';
import { LoggerConfigService, LogLevel } from './LoggerConfig';

// Layer colors for visual distinction
const LAYER_COLORS = {
  domain: '#3498db',      // Blue
  application: '#2ecc71', // Green
  infrastructure: '#e67e22', // Orange
  presentation: '#9b59b6', // Purple
  system: '#95a5a6',      // Gray
};

type Layer = keyof typeof LAYER_COLORS;

export interface LogContext {
  layer?: Layer;
  component?: string;
  requestId?: string;
  aggregateId?: string;
  userId?: string;
  action?: string;
  data?: Record<string, unknown>;
  duration?: number;
}

export class Logger {
  private pinoLogger: pino.Logger;
  private configService: LoggerConfigService;
  private requestCounter = 0;
  private logStore: Array<{
    timestamp: Date;
    level: string;
    message: string;
    context?: LogContext;
  }> = [];
  private maxStoredLogs = 100;

  constructor(name: string = 'Chirp') {
    this.configService = LoggerConfigService.getInstance();
    
    // Create Pino logger with browser-friendly configuration
    this.pinoLogger = pino({
      name,
      level: this.configService.getConfig().level,
      browser: {
        asObject: true,
        write: {
          trace: (obj: object) => this.writeLog('trace', obj as Record<string, unknown>),
          debug: (obj: object) => this.writeLog('debug', obj as Record<string, unknown>),
          info: (obj: object) => this.writeLog('info', obj as Record<string, unknown>),
          warn: (obj: object) => this.writeLog('warn', obj as Record<string, unknown>),
          error: (obj: object) => this.writeLog('error', obj as Record<string, unknown>),
        },
      },
    });

    // Listen for config changes
    this.configService.onChange((config) => {
      this.pinoLogger.level = config.level;
    });
  }

  private writeLog(level: string, obj: Record<string, unknown>): void {
    const config = this.configService.getConfig();
    if (!config.enabled) return;

    const context = obj.context as LogContext | undefined;
    const message = (obj.msg as string) || '';
    
    // Store log for admin panel
    this.logStore.push({
      timestamp: new Date(),
      level,
      message,
      context,
    });
    
    // Keep only last N logs
    if (this.logStore.length > this.maxStoredLogs) {
      this.logStore.shift();
    }

    // Format for console
    const layerColor = context?.layer ? LAYER_COLORS[context.layer] : LAYER_COLORS.system;
    const layerLabel = context?.layer ? `[${context.layer.toUpperCase()}]` : '[SYSTEM]';
    const componentLabel = context?.component ? `[${context.component}]` : '';
    const actionLabel = context?.action ? `→ ${context.action}` : '';
    
    const logMessage = `${layerLabel} ${componentLabel} ${message} ${actionLabel}`;
    
    // Console styling
    const style = `color: ${layerColor}; font-weight: bold;`;
    
    switch (level) {
      case 'trace':
        console.log(`%c[TRACE]`, style, logMessage, context?.data || '');
        break;
      case 'debug':
        console.log(`%c[DEBUG]`, style, logMessage, context?.data || '');
        break;
      case 'info':
        console.info(`%c[INFO]`, style, logMessage, context?.data || '');
        break;
      case 'warn':
        console.warn(`%c[WARN]`, style, logMessage, context?.data || '');
        break;
      case 'error':
        console.error(`%c[ERROR]`, style, logMessage, context?.data || '', obj.err || '');
        break;
    }
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    const logObject: Record<string, unknown> = {
      msg: message,
      context,
    };

    if (context?.data) {
      logObject.data = context.data;
    }

    this.pinoLogger[level](logObject);
  }

  trace(message: string, context?: LogContext): void {
    this.log('trace', message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const logObject: Record<string, unknown> = {
      msg: message,
      context,
    };

    if (error) {
      logObject.err = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    }

    this.pinoLogger.error(logObject);
  }

  // Create a child logger with persistent context
  child(context: LogContext): Logger {
    const childLogger = new Logger();
    childLogger.pinoLogger = this.pinoLogger.child({ context });
    childLogger.configService = this.configService;
    childLogger.logStore = this.logStore;
    return childLogger;
  }

  // Generate unique request ID
  generateRequestId(): string {
    return `req_${++this.requestCounter}_${Date.now()}`;
  }

  // Performance timing helper
  startTimer(): () => number {
    const start = performance.now();
    return () => performance.now() - start;
  }

  // Get stored logs for admin panel
  getStoredLogs() {
    return [...this.logStore];
  }

  // Clear stored logs
  clearStoredLogs(): void {
    this.logStore = [];
  }
}

// Export singleton instance
export const logger = new Logger();

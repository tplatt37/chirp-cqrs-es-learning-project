export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

export interface LoggerConfig {
  level: LogLevel;
  enabled: boolean;
}

export class LoggerConfigService {
  private static instance: LoggerConfigService;
  private config: LoggerConfig = {
    level: 'debug',
    enabled: true,
  };
  private listeners: Array<(config: LoggerConfig) => void> = [];

  private constructor() {}

  static getInstance(): LoggerConfigService {
    if (!LoggerConfigService.instance) {
      LoggerConfigService.instance = new LoggerConfigService();
    }
    return LoggerConfigService.instance;
  }

  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
    this.notifyListeners();
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    this.notifyListeners();
  }

  onChange(listener: (config: LoggerConfig) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.getConfig()));
  }
}

import { useState, useEffect } from 'react';
import { logger, LogContext } from '../../infrastructure/logging/Logger';
import { LoggerConfigService, LogLevel } from '../../infrastructure/logging/LoggerConfig';

export function AdminPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [logLevel, setLogLevel] = useState<LogLevel>('debug');
  const [isEnabled, setIsEnabled] = useState(true);
  const [logs, setLogs] = useState<Array<{
    timestamp: Date;
    level: string;
    message: string;
    context?: LogContext;
  }>>([]);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState(true);

  const logLevels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error'];
  const configService = LoggerConfigService.getInstance();

  useEffect(() => {
    const config = configService.getConfig();
    setLogLevel(config.level);
    setIsEnabled(config.enabled);

    // Update logs every 500ms
    const interval = setInterval(() => {
      setLogs(logger.getStoredLogs());
    }, 500);

    return () => clearInterval(interval);
  }, [configService]);

  const handleLevelChange = (level: LogLevel) => {
    setLogLevel(level);
    configService.setLevel(level);
    logger.info('Admin Panel: Log level changed', {
      layer: 'presentation',
      component: 'AdminPanel',
      action: 'changeLevelLevel',
      data: { newLevel: level },
    });
  };

  const handleEnabledToggle = () => {
    const newEnabled = !isEnabled;
    setIsEnabled(newEnabled);
    configService.setEnabled(newEnabled);
  };

  const handleClearLogs = () => {
    logger.clearStoredLogs();
    setLogs([]);
  };

  const handleExportLogs = () => {
    const logText = logs.map(log => 
      `[${log.timestamp.toISOString()}] [${log.level.toUpperCase()}] ${log.message}${
        log.context ? '\n' + JSON.stringify(log.context, null, 2) : ''
      }`
    ).join('\n\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chirp-logs-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = filterLevel === 'all' 
    ? logs 
    : logs.filter(log => log.level === filterLevel);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'trace': return '#95a5a6';
      case 'debug': return '#3498db';
      case 'info': return '#2ecc71';
      case 'warn': return '#f39c12';
      case 'error': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getLayerColor = (layer?: string) => {
    switch (layer) {
      case 'domain': return '#3498db';
      case 'application': return '#2ecc71';
      case 'infrastructure': return '#e67e22';
      case 'presentation': return '#9b59b6';
      default: return '#95a5a6';
    }
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          ...styles.toggleButton,
          backgroundColor: isOpen ? '#e74c3c' : '#1da1f2',
        }}
        title="Toggle Admin Panel"
      >
        {isOpen ? '✖' : '⚙️'}
      </button>

      {/* Admin Panel */}
      {isOpen && (
        <div style={styles.panel}>
          <div style={styles.header}>
            <h3 style={styles.title}>🔍 Administrator Panel</h3>
            <p style={styles.subtitle}>CQRS/Event Sourcing Logging Control</p>
          </div>

          {/* Controls */}
          <div style={styles.controls}>
            <div style={styles.controlGroup}>
              <label style={styles.label}>
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={handleEnabledToggle}
                  style={styles.checkbox}
                />
                Logging Enabled
              </label>
            </div>

            <div style={styles.controlGroup}>
              <label style={styles.label}>Log Level:</label>
              <select
                value={logLevel}
                onChange={(e) => handleLevelChange(e.target.value as LogLevel)}
                style={styles.select}
                disabled={!isEnabled}
              >
                {logLevels.map(level => (
                  <option key={level} value={level}>
                    {level.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.controlGroup}>
              <label style={styles.label}>Filter:</label>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                style={styles.select}
              >
                <option value="all">All Levels</option>
                {logLevels.map(level => (
                  <option key={level} value={level}>
                    {level.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.controlGroup}>
              <label style={styles.label}>
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  style={styles.checkbox}
                />
                Auto-scroll
              </label>
            </div>

            <div style={styles.buttonGroup}>
              <button onClick={handleClearLogs} style={styles.button}>
                Clear Logs
              </button>
              <button onClick={handleExportLogs} style={styles.button}>
                Export Logs
              </button>
            </div>
          </div>

          {/* Log display */}
          <div style={styles.logContainer}>
            <div style={styles.logHeader}>
              <span>Logs ({filteredLogs.length})</span>
              <span style={styles.logHelp}>
                Layers: <span style={{color: '#3498db'}}>■ Domain</span>{' '}
                <span style={{color: '#2ecc71'}}>■ Application</span>{' '}
                <span style={{color: '#e67e22'}}>■ Infrastructure</span>{' '}
                <span style={{color: '#9b59b6'}}>■ Presentation</span>
              </span>
            </div>
            <div 
              style={styles.logList}
              ref={(el) => {
                if (el && autoScroll) {
                  el.scrollTop = el.scrollHeight;
                }
              }}
            >
              {filteredLogs.length === 0 ? (
                <div style={styles.noLogs}>No logs to display</div>
              ) : (
                filteredLogs.map((log, index) => (
                  <div key={index} style={styles.logEntry}>
                    <div style={styles.logMeta}>
                      <span style={styles.logTimestamp}>
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                      <span 
                        style={{
                          ...styles.logLevel,
                          backgroundColor: getLevelColor(log.level),
                        }}
                      >
                        {log.level.toUpperCase()}
                      </span>
                      {log.context?.layer && (
                        <span 
                          style={{
                            ...styles.logLayer,
                            backgroundColor: getLayerColor(log.context.layer),
                          }}
                        >
                          {log.context.layer.toUpperCase()}
                        </span>
                      )}
                      {log.context?.component && (
                        <span style={styles.logComponent}>
                          {log.context.component}
                        </span>
                      )}
                    </div>
                    <div style={styles.logMessage}>{log.message}</div>
                    {log.context?.action && (
                      <div style={styles.logAction}>
                        → {log.context.action}
                      </div>
                    )}
                    {log.context?.data && (
                      <details style={styles.logDetails}>
                        <summary style={styles.logSummary}>Data</summary>
                        <pre style={styles.logData}>
                          {JSON.stringify(log.context.data, null, 2)}
                        </pre>
                      </details>
                    )}
                    {log.context?.duration !== undefined && (
                      <div style={styles.logDuration}>
                        ⏱ {log.context.duration.toFixed(2)}ms
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Info panel */}
          <div style={styles.info}>
            <h4 style={styles.infoTitle}>Logging Guide:</h4>
            <ul style={styles.infoList}>
              <li><strong>TRACE:</strong> Very detailed, step-by-step execution</li>
              <li><strong>DEBUG:</strong> Detailed information for debugging</li>
              <li><strong>INFO:</strong> General informational messages</li>
              <li><strong>WARN:</strong> Warning messages</li>
              <li><strong>ERROR:</strong> Error messages</li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  toggleButton: {
    position: 'fixed' as const,
    top: '20px',
    right: '20px',
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    border: 'none',
    color: 'white',
    fontSize: '24px',
    cursor: 'pointer',
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
    zIndex: 1000,
    transition: 'all 0.3s ease',
  },
  panel: {
    position: 'fixed' as const,
    top: '80px',
    right: '20px',
    width: '600px',
    maxHeight: '80vh',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    zIndex: 999,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    padding: '20px',
    backgroundColor: '#1da1f2',
    color: 'white',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 'bold' as const,
  },
  subtitle: {
    margin: '5px 0 0 0',
    fontSize: '12px',
    opacity: 0.9,
  },
  controls: {
    padding: '15px',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: '#f5f5f5',
  },
  controlGroup: {
    marginBottom: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500' as const,
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  checkbox: {
    cursor: 'pointer',
  },
  select: {
    padding: '5px 10px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    fontSize: '14px',
    cursor: 'pointer',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginTop: '10px',
  },
  button: {
    padding: '8px 16px',
    backgroundColor: '#1da1f2',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  logContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  logHeader: {
    padding: '10px 15px',
    backgroundColor: '#f9f9f9',
    borderBottom: '1px solid #e0e0e0',
    fontSize: '14px',
    fontWeight: '600' as const,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logHelp: {
    fontSize: '11px',
    color: '#666',
  },
  logList: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '10px',
  },
  noLogs: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#999',
    fontSize: '14px',
  },
  logEntry: {
    marginBottom: '10px',
    padding: '10px',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
    borderLeft: '3px solid #1da1f2',
    fontSize: '13px',
  },
  logMeta: {
    display: 'flex',
    gap: '8px',
    marginBottom: '5px',
    flexWrap: 'wrap' as const,
  },
  logTimestamp: {
    color: '#666',
    fontSize: '11px',
  },
  logLevel: {
    padding: '2px 8px',
    borderRadius: '3px',
    color: 'white',
    fontSize: '10px',
    fontWeight: 'bold' as const,
  },
  logLayer: {
    padding: '2px 8px',
    borderRadius: '3px',
    color: 'white',
    fontSize: '10px',
    fontWeight: 'bold' as const,
  },
  logComponent: {
    padding: '2px 8px',
    borderRadius: '3px',
    backgroundColor: '#e0e0e0',
    fontSize: '10px',
    fontWeight: '500' as const,
  },
  logMessage: {
    marginBottom: '5px',
    color: '#333',
  },
  logAction: {
    color: '#666',
    fontSize: '12px',
    fontStyle: 'italic' as const,
    marginBottom: '5px',
  },
  logDetails: {
    marginTop: '5px',
  },
  logSummary: {
    cursor: 'pointer',
    fontSize: '12px',
    color: '#1da1f2',
    fontWeight: '500' as const,
  },
  logData: {
    marginTop: '5px',
    padding: '8px',
    backgroundColor: '#2d2d2d',
    color: '#f8f8f2',
    borderRadius: '4px',
    fontSize: '11px',
    overflow: 'auto',
  },
  logDuration: {
    marginTop: '5px',
    fontSize: '11px',
    color: '#e67e22',
    fontWeight: '500' as const,
  },
  info: {
    padding: '15px',
    backgroundColor: '#f0f8ff',
    borderTop: '1px solid #e0e0e0',
  },
  infoTitle: {
    margin: '0 0 10px 0',
    fontSize: '14px',
    color: '#1da1f2',
  },
  infoList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '12px',
    lineHeight: '1.8',
  },
};

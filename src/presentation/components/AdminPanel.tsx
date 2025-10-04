import { useState, useEffect } from 'react';
import { logger, LogContext } from '../../infrastructure/logging/Logger';
import { LoggerConfigService, LogLevel } from '../../infrastructure/logging/LoggerConfig';
import { useContainer } from '../context/AppContext';
import { DomainEvent } from '../../domain/events/DomainEvent';
import { UserProfileReadModel, ChirpReadModel } from '../../application/ports/IReadModelRepository';

type TabType = 'logs' | 'eventStore' | 'readModel';

export function AdminPanel() {
  const container = useContainer();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('logs');
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

  // Data visualization state
  const [eventStoreData, setEventStoreData] = useState<{
    byAggregate: Map<string, DomainEvent[]>;
    totalEvents: number;
    aggregateCount: number;
  }>({
    byAggregate: new Map(),
    totalEvents: 0,
    aggregateCount: 0,
  });

  const [readModelData, setReadModelData] = useState<{
    users: Map<string, UserProfileReadModel>;
    chirps: Map<string, ChirpReadModel>;
    following: Map<string, Set<string>>;
    timelines: Map<string, string[]>;
    celebrityChirps: Map<string, string>;
    celebrityThreshold: number;
  }>({
    users: new Map(),
    chirps: new Map(),
    following: new Map(),
    timelines: new Map(),
    celebrityChirps: new Map(),
    celebrityThreshold: 0,
  });

  const [expandedAggregates, setExpandedAggregates] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['users']));

  const logLevels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error'];
  const configService = LoggerConfigService.getInstance();

  useEffect(() => {
    const config = configService.getConfig();
    setLogLevel(config.level);
    setIsEnabled(config.enabled);

    // Update logs and data every 500ms
    const interval = setInterval(() => {
      setLogs(logger.getStoredLogs());
      
      // Update event store data
      setEventStoreData({
        byAggregate: container.eventStore.getEventsByAggregate(),
        totalEvents: container.eventStore.getTotalEventCount(),
        aggregateCount: container.eventStore.getAggregateCount(),
      });

      // Update read model data
      setReadModelData({
        users: container.readModelRepository.getAllUsersMap(),
        chirps: container.readModelRepository.getAllChirpsMap(),
        following: container.readModelRepository.getFollowingMap(),
        timelines: container.readModelRepository.getMaterializedTimelinesMap(),
        celebrityChirps: container.readModelRepository.getCelebrityChirpsMap(),
        celebrityThreshold: container.readModelRepository.getCelebrityThreshold(),
      });
    }, 500);

    return () => clearInterval(interval);
  }, [configService, container]);

  const handleLevelChange = (level: LogLevel) => {
    setLogLevel(level);
    configService.setLevel(level);
    logger.info('Admin Panel: Log level changed', {
      layer: 'presentation',
      component: 'AdminPanel',
      action: 'changeLogLevel',
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

  const toggleAggregate = (aggregateId: string) => {
    const newExpanded = new Set(expandedAggregates);
    if (newExpanded.has(aggregateId)) {
      newExpanded.delete(aggregateId);
    } else {
      newExpanded.add(aggregateId);
    }
    setExpandedAggregates(newExpanded);
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
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

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'UserRegistered': return '#2ecc71';
      case 'ChirpPosted': return '#3498db';
      case 'UserFollowed': return '#9b59b6';
      default: return '#95a5a6';
    }
  };

  const renderLogsTab = () => (
    <>
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
      <div style={styles.contentContainer}>
        <div style={styles.sectionHeader}>
          <span>Logs ({filteredLogs.length})</span>
          <span style={styles.logHelp}>
            Layers: <span style={{color: '#3498db'}}>■ Domain</span>{' '}
            <span style={{color: '#2ecc71'}}>■ Application</span>{' '}
            <span style={{color: '#e67e22'}}>■ Infrastructure</span>{' '}
            <span style={{color: '#9b59b6'}}>■ Presentation</span>
          </span>
        </div>
        <div 
          style={styles.scrollContent}
          ref={(el) => {
            if (el && autoScroll) {
              el.scrollTop = el.scrollHeight;
            }
          }}
        >
          {filteredLogs.length === 0 ? (
            <div style={styles.emptyState}>No logs to display</div>
          ) : (
            filteredLogs.map((log, index) => (
              <div key={index} style={styles.logEntry}>
                <div style={styles.logMeta}>
                  <span style={styles.logTimestamp}>
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                  <span 
                    style={{
                      ...styles.badge,
                      backgroundColor: getLevelColor(log.level),
                    }}
                  >
                    {log.level.toUpperCase()}
                  </span>
                  {log.context?.layer && (
                    <span 
                      style={{
                        ...styles.badge,
                        backgroundColor: getLayerColor(log.context.layer),
                      }}
                    >
                      {log.context.layer.toUpperCase()}
                    </span>
                  )}
                  {log.context?.component && (
                    <span style={styles.componentBadge}>
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
                  <details style={styles.details}>
                    <summary style={styles.summary}>Data</summary>
                    <pre style={styles.codeBlock}>
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
      <div style={styles.infoPanel}>
        <h4 style={styles.infoPanelTitle}>Logging Guide:</h4>
        <ul style={styles.infoList}>
          <li><strong>TRACE:</strong> Very detailed, step-by-step execution</li>
          <li><strong>DEBUG:</strong> Detailed information for debugging</li>
          <li><strong>INFO:</strong> General informational messages</li>
          <li><strong>WARN:</strong> Warning messages</li>
          <li><strong>ERROR:</strong> Error messages</li>
        </ul>
      </div>
    </>
  );

  const renderEventStoreTab = () => (
    <>
      <div style={styles.statsBar}>
        <div style={styles.statItem}>
          <span style={styles.statLabel}>Total Events:</span>
          <span style={styles.statValue}>{eventStoreData.totalEvents}</span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statLabel}>Aggregates:</span>
          <span style={styles.statValue}>{eventStoreData.aggregateCount}</span>
        </div>
      </div>

      <div style={styles.contentContainer}>
        <div style={styles.sectionHeader}>
          Event Store Contents
        </div>
        <div style={styles.scrollContent}>
          {eventStoreData.aggregateCount === 0 ? (
            <div style={styles.emptyState}>
              No events in the event store yet. Register users or post chirps to see events appear here.
            </div>
          ) : (
            Array.from(eventStoreData.byAggregate.entries()).map(([aggregateId, events]) => (
              <div key={aggregateId} style={styles.aggregateBlock}>
                <div 
                  style={styles.aggregateHeader}
                  onClick={() => toggleAggregate(aggregateId)}
                >
                  <span style={styles.expandIcon}>
                    {expandedAggregates.has(aggregateId) ? '▼' : '▶'}
                  </span>
                  <span style={styles.aggregateId}>Aggregate: {aggregateId}</span>
                  <span style={styles.eventCount}>({events.length} events)</span>
                </div>
                
                {expandedAggregates.has(aggregateId) && (
                  <div style={styles.eventsContainer}>
                    {events.map((event, index) => (
                      <div key={index} style={styles.eventEntry}>
                        <div style={styles.eventMeta}>
                          <span 
                            style={{
                              ...styles.badge,
                              backgroundColor: getEventTypeColor(event.constructor.name),
                            }}
                          >
                            {event.constructor.name}
                          </span>
                          <span style={styles.timestamp}>
                            {event.occurredOn.toLocaleString()}
                          </span>
                        </div>
                        <details style={styles.details}>
                          <summary style={styles.summary}>Event Data</summary>
                          <pre style={styles.codeBlock}>
                            {JSON.stringify(event, null, 2)}
                          </pre>
                        </details>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );

  const renderReadModelTab = () => (
    <>
      <div style={styles.statsBar}>
        <div style={styles.statItem}>
          <span style={styles.statLabel}>Users:</span>
          <span style={styles.statValue}>{readModelData.users.size}</span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statLabel}>Chirps:</span>
          <span style={styles.statValue}>{readModelData.chirps.size}</span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statLabel}>Relationships:</span>
          <span style={styles.statValue}>{readModelData.following.size}</span>
        </div>
      </div>

      <div style={styles.contentContainer}>
        <div style={styles.sectionHeader}>
          Read Model Repository Contents
        </div>
        <div style={styles.scrollContent}>
          {/* Users Section */}
          <div style={styles.dataSection}>
            <div 
              style={styles.dataSectionHeader}
              onClick={() => toggleSection('users')}
            >
              <span style={styles.expandIcon}>
                {expandedSections.has('users') ? '▼' : '▶'}
              </span>
              <span style={styles.sectionTitle}>👥 Users ({readModelData.users.size})</span>
            </div>
            {expandedSections.has('users') && (
              <div style={styles.dataSectionContent}>
                {readModelData.users.size === 0 ? (
                  <div style={styles.emptyState}>No users yet</div>
                ) : (
                  Array.from(readModelData.users.values()).map(user => (
                    <div key={user.userId} style={styles.dataItem}>
                      <div style={styles.dataItemHeader}>
                        <strong>{user.username}</strong>
                        <span style={styles.idBadge}>{user.userId.slice(0, 8)}...</span>
                      </div>
                      <div style={styles.dataItemDetails}>
                        User ID: {user.userId}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Chirps Section */}
          <div style={styles.dataSection}>
            <div 
              style={styles.dataSectionHeader}
              onClick={() => toggleSection('chirps')}
            >
              <span style={styles.expandIcon}>
                {expandedSections.has('chirps') ? '▼' : '▶'}
              </span>
              <span style={styles.sectionTitle}>💬 Chirps ({readModelData.chirps.size})</span>
            </div>
            {expandedSections.has('chirps') && (
              <div style={styles.dataSectionContent}>
                {readModelData.chirps.size === 0 ? (
                  <div style={styles.emptyState}>No chirps yet</div>
                ) : (
                  Array.from(readModelData.chirps.values())
                    .sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime())
                    .map(chirp => (
                      <div key={chirp.chirpId} style={styles.dataItem}>
                        <div style={styles.dataItemHeader}>
                          <strong>{chirp.authorUsername}</strong>
                          <span style={styles.timestamp}>
                            {chirp.postedAt.toLocaleString()}
                          </span>
                        </div>
                        <div style={styles.chirpContent}>{chirp.content}</div>
                        <div style={styles.dataItemDetails}>
                          ID: {chirp.chirpId.slice(0, 8)}... | Author: {chirp.authorId.slice(0, 8)}...
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}
          </div>

          {/* Following Relationships Section */}
          <div style={styles.dataSection}>
            <div 
              style={styles.dataSectionHeader}
              onClick={() => toggleSection('following')}
            >
              <span style={styles.expandIcon}>
                {expandedSections.has('following') ? '▼' : '▶'}
              </span>
              <span style={styles.sectionTitle}>🔗 Following Relationships ({readModelData.following.size})</span>
            </div>
            {expandedSections.has('following') && (
              <div style={styles.dataSectionContent}>
                {readModelData.following.size === 0 ? (
                  <div style={styles.emptyState}>No follow relationships yet</div>
                ) : (
                  Array.from(readModelData.following.entries()).map(([followerId, followingSet]) => {
                    const follower = readModelData.users.get(followerId);
                    return (
                      <div key={followerId} style={styles.dataItem}>
                        <div style={styles.dataItemHeader}>
                          <strong>{follower?.username || 'Unknown'}</strong>
                          <span style={styles.countBadge}>
                            Following: {followingSet.size}
                          </span>
                        </div>
                        <div style={styles.followingList}>
                          {Array.from(followingSet).map(followeeId => {
                            const followee = readModelData.users.get(followeeId);
                            return (
                              <span key={followeeId} style={styles.followingItem}>
                                {followee?.username || 'Unknown'}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Materialized Timelines Section */}
          <div style={styles.dataSection}>
            <div 
              style={styles.dataSectionHeader}
              onClick={() => toggleSection('timelines')}
            >
              <span style={styles.expandIcon}>
                {expandedSections.has('timelines') ? '▼' : '▶'}
              </span>
              <span style={styles.sectionTitle}>📋 Materialized Timelines ({readModelData.timelines.size})</span>
            </div>
            {expandedSections.has('timelines') && (
              <div style={styles.dataSectionContent}>
                {readModelData.timelines.size === 0 ? (
                  <div style={styles.emptyState}>No timelines materialized yet</div>
                ) : (
                  Array.from(readModelData.timelines.entries()).map(([userId, chirpIds]) => {
                    const user = readModelData.users.get(userId);
                    return (
                      <div key={userId} style={styles.dataItem}>
                        <div style={styles.dataItemHeader}>
                          <strong>{user?.username || 'Unknown'}</strong>
                          <span style={styles.countBadge}>
                            {chirpIds.length} chirps
                          </span>
                        </div>
                        <div style={styles.timelineList}>
                          {chirpIds.slice(0, 5).map(chirpId => (
                            <div key={chirpId} style={styles.timelineItem}>
                              {chirpId.slice(0, 8)}...
                            </div>
                          ))}
                          {chirpIds.length > 5 && (
                            <div style={styles.timelineItem}>
                              ... and {chirpIds.length - 5} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Celebrity Chirps Section */}
          <div style={styles.dataSection}>
            <div 
              style={styles.dataSectionHeader}
              onClick={() => toggleSection('celebrity')}
            >
              <span style={styles.expandIcon}>
                {expandedSections.has('celebrity') ? '▼' : '▶'}
              </span>
              <span style={styles.sectionTitle}>⭐ Celebrity Chirps ({readModelData.celebrityChirps.size})</span>
            </div>
            {expandedSections.has('celebrity') && (
              <div style={styles.dataSectionContent}>
                <div style={styles.infoBox}>
                  Celebrity Threshold: {readModelData.celebrityThreshold} followers
                </div>
                {readModelData.celebrityChirps.size === 0 ? (
                  <div style={styles.emptyState}>No celebrity chirps yet</div>
                ) : (
                  Array.from(readModelData.celebrityChirps.entries()).map(([chirpId, authorId]) => {
                    const author = readModelData.users.get(authorId);
                    const chirp = readModelData.chirps.get(chirpId);
                    return (
                      <div key={chirpId} style={styles.dataItem}>
                        <div style={styles.dataItemHeader}>
                          <strong>⭐ {author?.username || 'Unknown'}</strong>
                        </div>
                        {chirp && (
                          <div style={styles.chirpContent}>{chirp.content}</div>
                        )}
                        <div style={styles.dataItemDetails}>
                          Chirp ID: {chirpId.slice(0, 8)}...
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

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
            <p style={styles.subtitle}>CQRS/Event Sourcing Data Inspector</p>
          </div>

          {/* Tab Navigation */}
          <div style={styles.tabBar}>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === 'logs' ? styles.activeTab : {}),
              }}
              onClick={() => setActiveTab('logs')}
            >
              📝 Logs
            </button>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === 'eventStore' ? styles.activeTab : {}),
              }}
              onClick={() => setActiveTab('eventStore')}
            >
              📦 Event Store
            </button>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === 'readModel' ? styles.activeTab : {}),
              }}
              onClick={() => setActiveTab('readModel')}
            >
              📊 Read Model
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'logs' && renderLogsTab()}
          {activeTab === 'eventStore' && renderEventStoreTab()}
          {activeTab === 'readModel' && renderReadModelTab()}
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
    width: '650px',
    maxHeight: '85vh',
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
  tabBar: {
    display: 'flex',
    backgroundColor: '#f5f5f5',
    borderBottom: '2px solid #e0e0e0',
  },
  tab: {
    flex: 1,
    padding: '12px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500' as const,
    transition: 'all 0.2s',
    borderBottom: '3px solid transparent',
  },
  activeTab: {
    backgroundColor: 'white',
    borderBottom: '3px solid #1da1f2',
    color: '#1da1f2',
  },
  controls: {
    padding: '15px',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: '#f9f9f9',
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
  statsBar: {
    display: 'flex',
    padding: '12px 15px',
    backgroundColor: '#f0f8ff',
    borderBottom: '1px solid #e0e0e0',
    gap: '20px',
  },
  statItem: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: '13px',
    color: '#666',
    fontWeight: '500' as const,
  },
  statValue: {
    fontSize: '16px',
    fontWeight: 'bold' as const,
    color: '#1da1f2',
  },
  contentContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  sectionHeader: {
    padding: '12px 15px',
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
  scrollContent: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '15px',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '40px 20px',
    color: '#999',
    fontSize: '14px',
  },
  logEntry: {
    marginBottom: '12px',
    padding: '12px',
    backgroundColor: '#f9f9f9',
    borderRadius: '6px',
    borderLeft: '3px solid #1da1f2',
    fontSize: '13px',
  },
  logMeta: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
  },
  logTimestamp: {
    color: '#666',
    fontSize: '11px',
  },
  badge: {
    padding: '3px 8px',
    borderRadius: '4px',
    color: 'white',
    fontSize: '10px',
    fontWeight: 'bold' as const,
  },
  componentBadge: {
    padding: '3px 8px',
    borderRadius: '4px',
    backgroundColor: '#e0e0e0',
    fontSize: '10px',
    fontWeight: '500' as const,
    color: '#333',
  },
  logMessage: {
    marginBottom: '6px',
    color: '#333',
    lineHeight: '1.5',
  },
  logAction: {
    color: '#666',
    fontSize: '12px',
    fontStyle: 'italic' as const,
    marginBottom: '6px',
  },
  details: {
    marginTop: '8px',
  },
  summary: {
    cursor: 'pointer',
    fontSize: '12px',
    color: '#1da1f2',
    fontWeight: '500' as const,
    userSelect: 'none' as const,
  },
  codeBlock: {
    marginTop: '8px',
    padding: '10px',
    backgroundColor: '#2d2d2d',
    color: '#f8f8f2',
    borderRadius: '4px',
    fontSize: '11px',
    overflow: 'auto',
    maxHeight: '300px',
  },
  logDuration: {
    marginTop: '6px',
    fontSize: '11px',
    color: '#e67e22',
    fontWeight: '500' as const,
  },
  infoPanel: {
    padding: '15px',
    backgroundColor: '#f0f8ff',
    borderTop: '1px solid #e0e0e0',
  },
  infoPanelTitle: {
    margin: '0 0 10px 0',
    fontSize: '14px',
    color: '#1da1f2',
    fontWeight: '600' as const,
  },
  infoList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '12px',
    lineHeight: '1.8',
  },
  aggregateBlock: {
    marginBottom: '15px',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  aggregateHeader: {
    padding: '12px 15px',
    backgroundColor: '#f5f5f5',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'background-color 0.2s',
    userSelect: 'none' as const,
  },
  expandIcon: {
    fontSize: '12px',
    color: '#666',
  },
  aggregateId: {
    flex: 1,
    fontSize: '13px',
    fontWeight: '600' as const,
    color: '#333',
  },
  eventCount: {
    fontSize: '12px',
    color: '#666',
  },
  eventsContainer: {
    padding: '10px',
    backgroundColor: 'white',
  },
  eventEntry: {
    marginBottom: '10px',
    padding: '10px',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
    borderLeft: '3px solid #3498db',
  },
  eventMeta: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    marginBottom: '8px',
  },
  timestamp: {
    fontSize: '11px',
    color: '#666',
  },
  dataSection: {
    marginBottom: '15px',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  dataSectionHeader: {
    padding: '12px 15px',
    backgroundColor: '#f5f5f5',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'background-color 0.2s',
    userSelect: 'none' as const,
  },
  sectionTitle: {
    flex: 1,
    fontSize: '14px',
    fontWeight: '600' as const,
    color: '#333',
  },
  dataSectionContent: {
    padding: '10px',
    backgroundColor: 'white',
  },
  dataItem: {
    marginBottom: '10px',
    padding: '12px',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
    border: '1px solid #e8e8e8',
  },
  dataItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  idBadge: {
    padding: '2px 8px',
    backgroundColor: '#e0e0e0',
    borderRadius: '3px',
    fontSize: '11px',
    fontFamily: 'monospace',
    color: '#666',
  },
  dataItemDetails: {
    fontSize: '12px',
    color: '#666',
  },
  chirpContent: {
    margin: '8px 0',
    padding: '8px',
    backgroundColor: 'white',
    borderRadius: '4px',
    fontSize: '13px',
    lineHeight: '1.4',
  },
  countBadge: {
    padding: '3px 8px',
    backgroundColor: '#1da1f2',
    color: 'white',
    borderRadius: '3px',
    fontSize: '11px',
    fontWeight: '500' as const,
  },
  followingList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
    marginTop: '8px',
  },
  followingItem: {
    padding: '4px 8px',
    backgroundColor: '#e8f4f8',
    borderRadius: '3px',
    fontSize: '12px',
    color: '#1da1f2',
  },
  timelineList: {
    marginTop: '8px',
  },
  timelineItem: {
    padding: '6px 10px',
    backgroundColor: 'white',
    borderRadius: '3px',
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#666',
    marginBottom: '4px',
  },
  infoBox: {
    padding: '10px',
    backgroundColor: '#fff3cd',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#856404',
    marginBottom: '10px',
    border: '1px solid #ffeeba',
  },
};

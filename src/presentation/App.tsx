import { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { useAppState } from './hooks/useAppState';
import { RegisterForm } from './components/RegisterForm';
import { ChirpComposer } from './components/ChirpComposer';
import { ChirpList } from './components/ChirpList';
import { UserList } from './components/UserList';
import { AdminPanel } from './components/AdminPanel';
import { logger } from '../infrastructure/logging/Logger';

function AppContent() {
  const { currentUserId, setCurrentUserId, users, feed, error, setError, refresh } = useAppState();
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  const currentUser = users.find((u) => u.userId === currentUserId);

  logger.debug('AppContent: Rendering', {
    layer: 'presentation',
    component: 'AppContent',
    action: 'render',
    data: { 
      currentUserId,
      userCount: users.length,
      chirpCount: feed.length,
      hasError: !!error,
    },
  });

  const handleSuccess = () => {
    logger.info('AppContent: Action completed successfully', {
      layer: 'presentation',
      component: 'AppContent',
      action: 'handleSuccess',
    });
    setError(null);
    refresh();
  };

  return (
    <div style={styles.wrapper}>
      {/* Admin Panel Toggle Button */}
      <button
        onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)}
        style={{
          ...styles.toggleButton,
          backgroundColor: isAdminPanelOpen ? '#e74c3c' : '#1da1f2',
        }}
        title="Toggle Admin Panel"
      >
        {isAdminPanelOpen ? '✖' : '⚙️'}
      </button>

      {/* Main Layout Container */}
      <div style={styles.layoutContainer}>
        {/* Main App Content */}
        <div style={{
          ...styles.container,
          width: isAdminPanelOpen ? '50%' : '100%',
        }}>
      <header style={styles.header}>
        <h1 style={styles.title}>🐦 Chirp</h1>
        <p style={styles.subtitle}>A DDD/CQRS/Event Sourcing Demo</p>
      </header>

      {error && (
        <div style={styles.error}>
          <strong>Error:</strong> {error}
          <button onClick={() => setError(null)} style={styles.closeButton}>
            ×
          </button>
        </div>
      )}

      <div style={styles.content}>
        <aside style={styles.sidebar}>
          <RegisterForm onSuccess={handleSuccess} onError={setError} />
          
          <UserList
            users={users}
            currentUserId={currentUserId}
            onUserSelect={setCurrentUserId}
            onSuccess={handleSuccess}
            onError={setError}
          />
        </aside>

        <main style={styles.main}>
          {currentUserId ? (
            <>
              <div style={styles.currentUser}>
                <h2 style={styles.currentUserHeading}>
                  Logged in as: <span style={styles.username}>@{currentUser?.username}</span>
                </h2>
              </div>

              <ChirpComposer
                currentUserId={currentUserId}
                onSuccess={handleSuccess}
                onError={setError}
              />

              <ChirpList chirps={feed} />
            </>
          ) : (
            <div style={styles.welcome}>
              <h2>Welcome to Chirp!</h2>
              <p>Register a new user or select an existing user to get started.</p>
              <div style={styles.architectureInfo}>
                <h3>Architecture Demo:</h3>
                <ul>
                  <li><strong>Domain-Driven Design:</strong> User, Chirp, and FollowRelationship aggregates</li>
                  <li><strong>Hexagonal Architecture:</strong> Clean separation of domain, application, and infrastructure</li>
                  <li><strong>CQRS:</strong> Separate command and query paths</li>
                  <li><strong>Event Sourcing:</strong> All changes recorded as immutable events</li>
                </ul>
              </div>
            </div>
          )}
        </main>
      </div>
        </div>

        {/* Admin Panel */}
        {isAdminPanelOpen && (
          <AdminPanel />
        )}
      </div>
    </div>
  );
}

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
    minHeight: '100vh',
  },
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
  layoutContainer: {
    display: 'flex',
    width: '100%',
    minHeight: '100vh',
  },
  container: {
    minHeight: '100vh',
    backgroundColor: '#f0f2f5',
    transition: 'width 0.3s ease',
    overflow: 'auto',
  },
  header: {
    backgroundColor: '#1da1f2',
    color: 'white',
    padding: '20px',
    textAlign: 'center' as const,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  title: {
    margin: 0,
    fontSize: '32px',
    fontWeight: 'bold' as const,
  },
  subtitle: {
    margin: '5px 0 0 0',
    fontSize: '14px',
    opacity: 0.9,
  },
  error: {
    margin: '20px auto',
    maxWidth: '1200px',
    padding: '15px',
    backgroundColor: '#ffebee',
    border: '1px solid #ef5350',
    borderRadius: '4px',
    color: '#c62828',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#c62828',
    padding: '0 10px',
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    display: 'flex',
    gap: '20px',
  },
  sidebar: {
    flex: '0 0 350px',
  },
  main: {
    flex: 1,
  },
  currentUser: {
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  currentUserHeading: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 'normal' as const,
  },
  username: {
    color: '#1da1f2',
    fontWeight: 'bold' as const,
  },
  welcome: {
    padding: '40px',
    backgroundColor: 'white',
    borderRadius: '8px',
    textAlign: 'center' as const,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  architectureInfo: {
    marginTop: '30px',
    padding: '20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    textAlign: 'left' as const,
  },
};

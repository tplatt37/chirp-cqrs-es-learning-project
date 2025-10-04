import React, { useState } from 'react';
import { useContainer } from '../context/AppContext';
import { RegisterUserCommand } from '../../application/commands/RegisterUserCommand';
import { logger } from '../../infrastructure/logging/Logger';

interface RegisterFormProps {
  onSuccess: (userId: string) => void;
  onError: (error: string) => void;
}

export function RegisterForm({ onSuccess, onError }: RegisterFormProps) {
  const container = useContainer();
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    logger.info('RegisterForm: User submitted registration form', {
      layer: 'presentation',
      component: 'RegisterForm',
      action: 'handleSubmit',
      data: { username },
    });

    if (!username.trim()) {
      logger.warn('RegisterForm: Empty username submitted', {
        layer: 'presentation',
        component: 'RegisterForm',
        action: 'handleSubmit',
      });
      onError('Username is required');
      return;
    }

    setIsSubmitting(true);
    const timer = logger.startTimer();

    try {
      logger.debug('RegisterForm: Creating RegisterUserCommand', {
        layer: 'presentation',
        component: 'RegisterForm',
        action: 'createCommand',
        data: { username },
      });

      const command = new RegisterUserCommand(username);
      
      logger.info('RegisterForm: Executing command via handler', {
        layer: 'presentation',
        component: 'RegisterForm',
        action: 'executeCommand',
      });

      const userId = await container.registerUserHandler.handle(command);
      
      logger.debug('RegisterForm: Projecting events after command', {
        layer: 'presentation',
        component: 'RegisterForm',
        action: 'projectEvents',
      });

      await container.projectEventsAfterCommand();
      
      const duration = timer();
      logger.info('RegisterForm: User registered successfully', {
        layer: 'presentation',
        component: 'RegisterForm',
        action: 'handleSubmit',
        data: { userId, username },
        duration,
      });

      setUsername('');
      onSuccess(userId);
    } catch (err) {
      const duration = timer();
      logger.error('RegisterForm: Registration failed', err instanceof Error ? err : undefined, {
        layer: 'presentation',
        component: 'RegisterForm',
        action: 'handleSubmit',
        data: { username },
        duration,
      });
      onError(err instanceof Error ? err.message : 'Failed to register user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h2 style={styles.heading}>Register New User</h2>
      <div style={styles.inputGroup}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username"
          disabled={isSubmitting}
          style={styles.input}
          maxLength={20}
        />
        <button type="submit" disabled={isSubmitting} style={styles.button}>
          {isSubmitting ? 'Registering...' : 'Register'}
        </button>
      </div>
    </form>
  );
}

const styles = {
  form: {
    marginBottom: '20px',
    padding: '20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
  },
  heading: {
    marginTop: 0,
    marginBottom: '15px',
    fontSize: '18px',
  },
  inputGroup: {
    display: 'flex',
    gap: '10px',
  },
  input: {
    flex: 1,
    padding: '10px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  button: {
    padding: '10px 20px',
    fontSize: '14px',
    backgroundColor: '#1da1f2',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

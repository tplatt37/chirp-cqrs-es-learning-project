import React, { useState } from 'react';
import { useContainer } from '../context/AppContext';
import { RegisterUserCommand } from '../../application/commands/RegisterUserCommand';

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
    
    if (!username.trim()) {
      onError('Username is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const command = new RegisterUserCommand(username);
      const userId = await container.registerUserHandler.handle(command);
      await container.projectEventsAfterCommand();
      
      setUsername('');
      onSuccess(userId);
    } catch (err) {
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

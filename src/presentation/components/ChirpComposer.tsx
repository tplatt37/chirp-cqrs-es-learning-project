import React, { useState } from 'react';
import { useContainer } from '../context/AppContext';
import { PostChirpCommand } from '../../application/commands/PostChirpCommand';
import { logger } from '../../infrastructure/logging/Logger';

interface ChirpComposerProps {
  currentUserId: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function ChirpComposer({ currentUserId, onSuccess, onError }: ChirpComposerProps) {
  const container = useContainer();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    logger.info('ChirpComposer: User submitted chirp', {
      layer: 'presentation',
      component: 'ChirpComposer',
      action: 'handleSubmit',
      data: { 
        currentUserId,
        contentLength: content.length,
      },
    });

    if (!content.trim()) {
      logger.warn('ChirpComposer: Empty content submitted', {
        layer: 'presentation',
        component: 'ChirpComposer',
        action: 'handleSubmit',
      });
      onError('Chirp content is required');
      return;
    }

    setIsSubmitting(true);
    const timer = logger.startTimer();

    try {
      logger.debug('ChirpComposer: Creating PostChirpCommand', {
        layer: 'presentation',
        component: 'ChirpComposer',
        action: 'createCommand',
        data: { currentUserId, contentLength: content.length },
      });

      const command = new PostChirpCommand(currentUserId, content);
      
      logger.info('ChirpComposer: Executing command via handler', {
        layer: 'presentation',
        component: 'ChirpComposer',
        action: 'executeCommand',
      });

      await container.postChirpHandler.handle(command);
      
      logger.debug('ChirpComposer: Projecting events after command', {
        layer: 'presentation',
        component: 'ChirpComposer',
        action: 'projectEvents',
      });

      await container.projectEventsAfterCommand();
      
      const duration = timer();
      logger.info('ChirpComposer: Chirp posted successfully', {
        layer: 'presentation',
        component: 'ChirpComposer',
        action: 'handleSubmit',
        data: { currentUserId },
        duration,
      });

      setContent('');
      onSuccess();
    } catch (err) {
      const duration = timer();
      logger.error('ChirpComposer: Failed to post chirp', err instanceof Error ? err : undefined, {
        layer: 'presentation',
        component: 'ChirpComposer',
        action: 'handleSubmit',
        data: { currentUserId },
        duration,
      });
      onError(err instanceof Error ? err.message : 'Failed to post chirp');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h2 style={styles.heading}>Post a Chirp</h2>
      <div style={styles.inputGroup}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's happening?"
          disabled={isSubmitting}
          style={styles.textarea}
          maxLength={280}
          rows={3}
        />
        <div style={styles.footer}>
          <span style={styles.counter}>{content.length}/280</span>
          <button type="submit" disabled={isSubmitting || !content.trim()} style={styles.button}>
            {isSubmitting ? 'Posting...' : 'Post Chirp'}
          </button>
        </div>
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
    flexDirection: 'column' as const,
    gap: '10px',
  },
  textarea: {
    padding: '10px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counter: {
    fontSize: '12px',
    color: '#666',
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

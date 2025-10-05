import { useState, useEffect } from 'react';
import { useContainer } from '../context/AppContext';
import { UserProfileReadModel } from '../../application/ports/IReadModelRepository';
import { FollowUserCommand } from '../../application/commands/FollowUserCommand';
import { UnfollowUserCommand } from '../../application/commands/UnfollowUserCommand';

interface UserListProps {
  users: UserProfileReadModel[];
  currentUserId: string | null;
  onUserSelect: (userId: string) => void;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function UserList({ users, currentUserId, onUserSelect, onSuccess, onError }: UserListProps) {
  const container = useContainer();
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [followingMap, setFollowingMap] = useState<Map<string, boolean>>(new Map());

  // Load following relationships when currentUserId changes
  useEffect(() => {
    const loadFollowingRelationships = async () => {
      if (!currentUserId) {
        setFollowingMap(new Map());
        return;
      }

      const newFollowingMap = new Map<string, boolean>();
      for (const user of users) {
        if (user.userId !== currentUserId) {
          const isFollowing = await container.readModelRepository.isFollowing(
            currentUserId,
            user.userId
          );
          newFollowingMap.set(user.userId, isFollowing);
        }
      }
      setFollowingMap(newFollowingMap);
    };

    loadFollowingRelationships();
  }, [currentUserId, users, container.readModelRepository]);

  const handleFollow = async (followeeId: string) => {
    if (!currentUserId) {
      onError('Please select a user first');
      return;
    }

    setProcessingUserId(followeeId);
    try {
      const command = new FollowUserCommand(currentUserId, followeeId);
      await container.followUserHandler.handle(command);
      await container.projectEventsAfterCommand();
      
      // Update local state
      setFollowingMap(prev => new Map(prev).set(followeeId, true));
      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to follow user');
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleUnfollow = async (followeeId: string) => {
    if (!currentUserId) {
      onError('Please select a user first');
      return;
    }

    setProcessingUserId(followeeId);
    try {
      const command = new UnfollowUserCommand(currentUserId, followeeId);
      await container.unfollowUserHandler.handle(command);
      await container.projectEventsAfterCommand();
      
      // Update local state
      setFollowingMap(prev => new Map(prev).set(followeeId, false));
      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to unfollow user');
    } finally {
      setProcessingUserId(null);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Users</h2>
      {users.length === 0 ? (
        <p style={styles.empty}>No users registered yet.</p>
      ) : (
        <div style={styles.list}>
          {users.map((user) => {
            const isCurrentUser = user.userId === currentUserId;
            const isFollowingUser = followingMap.get(user.userId) || false;
            const isProcessing = processingUserId === user.userId;

            return (
              <div key={user.userId} style={styles.user}>
                <div style={styles.userInfo}>
                  <span style={styles.username}>@{user.username}</span>
                  {isCurrentUser && <span style={styles.badge}>(You)</span>}
                </div>
                <div style={styles.actions}>
                  {!isCurrentUser && currentUserId && (
                    <>
                      {isFollowingUser ? (
                        <button
                          onClick={() => handleUnfollow(user.userId)}
                          disabled={isProcessing}
                          style={{...styles.followButton, ...styles.unfollowButton}}
                        >
                          {isProcessing ? 'Processing...' : 'Unfollow'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleFollow(user.userId)}
                          disabled={isProcessing}
                          style={styles.followButton}
                        >
                          {isProcessing ? 'Processing...' : 'Follow'}
                        </button>
                      )}
                    </>
                  )}
                  {!isCurrentUser && (
                    <button
                      onClick={() => onUserSelect(user.userId)}
                      style={styles.selectButton}
                    >
                      {currentUserId === user.userId ? 'Selected' : 'Select'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
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
  empty: {
    color: '#666',
    fontStyle: 'italic' as const,
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  user: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: 'white',
    border: '1px solid #e1e8ed',
    borderRadius: '4px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  username: {
    fontWeight: 'bold' as const,
  },
  badge: {
    fontSize: '12px',
    color: '#666',
    fontStyle: 'italic' as const,
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  followButton: {
    padding: '6px 12px',
    fontSize: '12px',
    backgroundColor: '#1da1f2',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  unfollowButton: {
    backgroundColor: '#657786',
  },
  selectButton: {
    padding: '6px 12px',
    fontSize: '12px',
    backgroundColor: '#657786',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

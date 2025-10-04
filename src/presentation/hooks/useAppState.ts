import { useState, useEffect, useCallback } from 'react';
import { useContainer } from '../context/AppContext';
import { UserProfileReadModel, ChirpReadModel } from '../../application/ports/IReadModelRepository';
import { GetAllUsersQuery } from '../../application/queries/GetAllUsersQuery';
import { GetUserFeedQuery } from '../../application/queries/GetUserFeedQuery';

export function useAppState() {
  const container = useContainer();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfileReadModel[]>([]);
  const [feed, setFeed] = useState<ChirpReadModel[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      const query = new GetAllUsersQuery();
      const loadedUsers = await container.getAllUsersHandler.handle(query);
      setUsers(loadedUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    }
  }, [container]);

  const loadFeed = useCallback(async () => {
    if (!currentUserId) return;
    
    try {
      const query = new GetUserFeedQuery(currentUserId);
      const loadedFeed = await container.getUserFeedHandler.handle(query);
      setFeed(loadedFeed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed');
    }
  }, [currentUserId, container]);

  const refresh = useCallback(async () => {
    await loadUsers();
    await loadFeed();
  }, [loadUsers, loadFeed]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  return {
    currentUserId,
    setCurrentUserId,
    users,
    feed,
    error,
    setError,
    refresh,
  };
}

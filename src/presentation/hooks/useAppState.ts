import { useState, useEffect, useCallback } from 'react';
import { useContainer } from '../context/AppContext';
import { UserProfileReadModel, ChirpReadModel } from '../../application/ports/IReadModelRepository';
import { GetAllUsersQuery } from '../../application/queries/GetAllUsersQuery';
import { GetUserFeedQuery } from '../../application/queries/GetUserFeedQuery';
import { DeleteChirpCommand } from '../../application/commands/DeleteChirpCommand';

export function useAppState() {
  const container = useContainer();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfileReadModel[]>([]);
  const [feed, setFeed] = useState<ChirpReadModel[]>([]);
  const [ownChirps, setOwnChirps] = useState<ChirpReadModel[]>([]);
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

  const loadOwnChirps = useCallback(async () => {
    if (!currentUserId) {
      setOwnChirps([]);
      return;
    }
    
    try {
      const chirps = await container.readModelRepository.getChirpsByAuthor(currentUserId);
      setOwnChirps(chirps);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load own chirps');
    }
  }, [currentUserId, container]);

  const refresh = useCallback(async () => {
    await loadUsers();
    await loadFeed();
    await loadOwnChirps();
  }, [loadUsers, loadFeed, loadOwnChirps]);

  const deleteChirp = useCallback(async (chirpId: string) => {
    if (!currentUserId) {
      setError('Must be logged in to delete chirps');
      return;
    }

    try {
      const command = new DeleteChirpCommand(chirpId, currentUserId);
      await container.deleteChirpHandler.handle(command);
      await container.projectEventsAfterCommand();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete chirp');
    }
  }, [currentUserId, container, refresh]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    loadOwnChirps();
  }, [loadOwnChirps]);

  return {
    currentUserId,
    setCurrentUserId,
    users,
    feed,
    ownChirps,
    error,
    setError,
    refresh,
    deleteChirp,
  };
}

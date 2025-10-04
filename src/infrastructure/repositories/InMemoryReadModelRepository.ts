import {
  IReadModelRepository,
  UserProfileReadModel,
  ChirpReadModel,
} from '../../application/ports/IReadModelRepository';

export class InMemoryReadModelRepository implements IReadModelRepository {
  private users: Map<string, UserProfileReadModel> = new Map();
  private chirps: Map<string, ChirpReadModel> = new Map();
  private following: Map<string, Set<string>> = new Map(); // followerId -> Set of followeeIds

  // User profile operations
  async saveUserProfile(profile: UserProfileReadModel): Promise<void> {
    this.users.set(profile.userId, profile);
  }

  async getUserProfile(userId: string): Promise<UserProfileReadModel | null> {
    return this.users.get(userId) || null;
  }

  async getUserProfileByUsername(username: string): Promise<UserProfileReadModel | null> {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return null;
  }

  async getAllUsers(): Promise<UserProfileReadModel[]> {
    return Array.from(this.users.values());
  }

  // Chirp operations
  async saveChirp(chirp: ChirpReadModel): Promise<void> {
    this.chirps.set(chirp.chirpId, chirp);
  }

  async getChirp(chirpId: string): Promise<ChirpReadModel | null> {
    return this.chirps.get(chirpId) || null;
  }

  async getChirpsByAuthor(authorId: string): Promise<ChirpReadModel[]> {
    const chirps = Array.from(this.chirps.values()).filter(
      (chirp) => chirp.authorId === authorId
    );
    return chirps.sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime());
  }

  async getAllChirps(): Promise<ChirpReadModel[]> {
    return Array.from(this.chirps.values()).sort(
      (a, b) => b.postedAt.getTime() - a.postedAt.getTime()
    );
  }

  // Follow operations
  async addFollowing(followerId: string, followeeId: string): Promise<void> {
    const followingSet = this.following.get(followerId) || new Set();
    followingSet.add(followeeId);
    this.following.set(followerId, followingSet);
  }

  async getFollowing(userId: string): Promise<string[]> {
    const followingSet = this.following.get(userId);
    return followingSet ? Array.from(followingSet) : [];
  }

  async getFollowers(userId: string): Promise<string[]> {
    const followers: string[] = [];
    for (const [followerId, followingSet] of this.following.entries()) {
      if (followingSet.has(userId)) {
        followers.push(followerId);
      }
    }
    return followers;
  }

  async isFollowing(followerId: string, followeeId: string): Promise<boolean> {
    const followingSet = this.following.get(followerId);
    return followingSet ? followingSet.has(followeeId) : false;
  }

  // Feed operations
  async getUserFeed(userId: string): Promise<ChirpReadModel[]> {
    const followingIds = await this.getFollowing(userId);
    
    // Get all chirps from users being followed
    const feedChirps = Array.from(this.chirps.values()).filter((chirp) =>
      followingIds.includes(chirp.authorId)
    );

    // Sort by posted date (most recent first)
    return feedChirps.sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime());
  }
}

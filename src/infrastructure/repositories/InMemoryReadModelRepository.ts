import {
  IReadModelRepository,
  UserProfileReadModel,
  ChirpReadModel,
} from '../../application/ports/IReadModelRepository';

export class InMemoryReadModelRepository implements IReadModelRepository {
  private users: Map<string, UserProfileReadModel> = new Map();
  private chirps: Map<string, ChirpReadModel> = new Map();
  private following: Map<string, Set<string>> = new Map(); // followerId -> Set of followeeIds
  private followRelationshipIds: Map<string, string> = new Map(); // "followerId:followeeId" -> relationshipId

  // Materialized timeline storage for write-time fan-out
  private materializedTimelines: Map<string, string[]> = new Map(); // userId -> [chirpId...] (sorted by time, newest first)
  private celebrityChirps: Map<string, string> = new Map(); // chirpId -> authorId (tracks chirps from celebrities)
  private readonly CELEBRITY_THRESHOLD = 1000; // Users with > 1000 followers are celebrities
  private readonly MAX_TIMELINE_SIZE = 800; // Maximum chirps per user timeline

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
  async addFollowing(followerId: string, followeeId: string, relationshipId?: string): Promise<void> {
    const followingSet = this.following.get(followerId) || new Set();
    followingSet.add(followeeId);
    this.following.set(followerId, followingSet);
    
    // Store relationship ID if provided
    if (relationshipId) {
      const key = `${followerId}:${followeeId}`;
      this.followRelationshipIds.set(key, relationshipId);
    }
  }

  async removeFollowing(followerId: string, followeeId: string): Promise<void> {
    const followingSet = this.following.get(followerId);
    if (followingSet) {
      followingSet.delete(followeeId);
      if (followingSet.size === 0) {
        this.following.delete(followerId);
      }
    }
    
    // Remove relationship ID mapping
    const key = `${followerId}:${followeeId}`;
    this.followRelationshipIds.delete(key);
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

  async getFollowRelationshipId(followerId: string, followeeId: string): Promise<string | null> {
    const key = `${followerId}:${followeeId}`;
    return this.followRelationshipIds.get(key) || null;
  }

  // Feed operations (OLD IMPLEMENTATION - will be replaced with materialized timeline approach)
  async getUserFeed(userId: string): Promise<ChirpReadModel[]> {
    // Get materialized timeline (pre-fanned chirp IDs)
    const timelineChirpIds = await this.getMaterializedTimeline(userId);
    
    // Get celebrity chirps from followed celebrities
    const followingIds = await this.getFollowing(userId);
    const celebrityChirpIds = await this.getCelebrityChirpsForUser(userId, followingIds);
    
    // Merge both lists - combine and deduplicate
    const allChirpIds = [...new Set([...timelineChirpIds, ...celebrityChirpIds])];
    
    // Batch fetch full chirp data
    const chirps: ChirpReadModel[] = [];
    for (const chirpId of allChirpIds) {
      const chirp = this.chirps.get(chirpId);
      if (chirp) {
        chirps.push(chirp);
      }
    }
    
    // Sort by posted date (most recent first)
    return chirps.sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime());
  }

  // Materialized timeline operations
  async addToTimeline(userId: string, chirpId: string): Promise<void> {
    // Get or create timeline for user
    let timeline = this.materializedTimelines.get(userId) || [];
    
    // Add chirp ID to the beginning (newest first)
    timeline.unshift(chirpId);
    
    // Trim timeline to max size to control memory
    if (timeline.length > this.MAX_TIMELINE_SIZE) {
      timeline = timeline.slice(0, this.MAX_TIMELINE_SIZE);
    }
    
    this.materializedTimelines.set(userId, timeline);
  }

  async removeFromTimeline(userId: string, chirpId: string): Promise<void> {
    const timeline = this.materializedTimelines.get(userId);
    if (timeline) {
      const index = timeline.indexOf(chirpId);
      if (index > -1) {
        timeline.splice(index, 1);
      }
    }
  }

  async removeAllChirpsFromTimeline(userId: string, authorId: string): Promise<void> {
    const timeline = this.materializedTimelines.get(userId);
    if (!timeline) return;
    
    // Filter out all chirps from the specified author
    const authorChirps = await this.getChirpsByAuthor(authorId);
    const authorChirpIds = new Set(authorChirps.map(c => c.chirpId));
    
    const filteredTimeline = timeline.filter(chirpId => !authorChirpIds.has(chirpId));
    this.materializedTimelines.set(userId, filteredTimeline);
  }

  async getMaterializedTimeline(userId: string): Promise<string[]> {
    return this.materializedTimelines.get(userId) || [];
  }

  async addCelebrityChirp(chirpId: string, authorId: string): Promise<void> {
    // Track this chirp as coming from a celebrity
    this.celebrityChirps.set(chirpId, authorId);
  }

  async getCelebrityChirpsForUser(_userId: string, following: string[]): Promise<string[]> {
    // Find all celebrity chirps from users being followed
    const celebrityChirpIds: string[] = [];
    
    for (const [chirpId, authorId] of this.celebrityChirps.entries()) {
      if (following.includes(authorId)) {
        celebrityChirpIds.push(chirpId);
      }
    }
    
    return celebrityChirpIds;
  }

  async isCelebrity(userId: string): Promise<boolean> {
    const followers = await this.getFollowers(userId);
    return followers.length > this.CELEBRITY_THRESHOLD;
  }

  // Getter methods for admin panel visualization
  getAllUsersMap(): Map<string, UserProfileReadModel> {
    return new Map(this.users);
  }

  getAllChirpsMap(): Map<string, ChirpReadModel> {
    return new Map(this.chirps);
  }

  getFollowingMap(): Map<string, Set<string>> {
    return new Map(this.following);
  }

  getMaterializedTimelinesMap(): Map<string, string[]> {
    return new Map(this.materializedTimelines);
  }

  getCelebrityChirpsMap(): Map<string, string> {
    return new Map(this.celebrityChirps);
  }

  getCelebrityThreshold(): number {
    return this.CELEBRITY_THRESHOLD;
  }
}

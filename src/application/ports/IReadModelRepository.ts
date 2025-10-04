export interface UserProfileReadModel {
  userId: string;
  username: string;
}

export interface ChirpReadModel {
  chirpId: string;
  authorId: string;
  authorUsername: string;
  content: string;
  postedAt: Date;
}

export interface IReadModelRepository {
  // User profile operations
  saveUserProfile(profile: UserProfileReadModel): Promise<void>;
  getUserProfile(userId: string): Promise<UserProfileReadModel | null>;
  getUserProfileByUsername(username: string): Promise<UserProfileReadModel | null>;
  getAllUsers(): Promise<UserProfileReadModel[]>;

  // Chirp operations
  saveChirp(chirp: ChirpReadModel): Promise<void>;
  getChirp(chirpId: string): Promise<ChirpReadModel | null>;
  getChirpsByAuthor(authorId: string): Promise<ChirpReadModel[]>;
  getAllChirps(): Promise<ChirpReadModel[]>;

  // Follow operations
  addFollowing(followerId: string, followeeId: string): Promise<void>;
  getFollowing(userId: string): Promise<string[]>;
  getFollowers(userId: string): Promise<string[]>;
  isFollowing(followerId: string, followeeId: string): Promise<boolean>;

  // Feed operations
  getUserFeed(userId: string): Promise<ChirpReadModel[]>;

  // Materialized timeline operations
  addToTimeline(userId: string, chirpId: string): Promise<void>;
  getMaterializedTimeline(userId: string): Promise<string[]>;
  addCelebrityChirp(chirpId: string, authorId: string): Promise<void>;
  getCelebrityChirpsForUser(userId: string, following: string[]): Promise<string[]>;
  isCelebrity(userId: string): Promise<boolean>;
}

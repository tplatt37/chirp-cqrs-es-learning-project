export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
    Object.setPrototypeOf(this, DomainError.prototype);
  }
}

export class UserAlreadyExistsError extends DomainError {
  constructor(username: string) {
    super(`User with username '${username}' already exists`);
    this.name = 'UserAlreadyExistsError';
  }
}

export class UserNotFoundError extends DomainError {
  constructor(userId: string) {
    super(`User with id '${userId}' not found`);
    this.name = 'UserNotFoundError';
  }
}

export class AlreadyFollowingError extends DomainError {
  constructor(followerId: string, followeeId: string) {
    super(`User ${followerId} is already following user ${followeeId}`);
    this.name = 'AlreadyFollowingError';
  }
}

export class CannotFollowSelfError extends DomainError {
  constructor() {
    super('A user cannot follow themselves');
    this.name = 'CannotFollowSelfError';
  }
}

export class NotFollowingError extends DomainError {
  constructor(followerId: string, followeeId: string) {
    super(`User ${followerId} is not following user ${followeeId}`);
    this.name = 'NotFollowingError';
  }
}

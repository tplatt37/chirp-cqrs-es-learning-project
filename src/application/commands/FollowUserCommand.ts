export class FollowUserCommand {
  constructor(
    public readonly followerId: string,
    public readonly followeeId: string
  ) {}
}

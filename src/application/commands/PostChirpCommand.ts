export class PostChirpCommand {
  constructor(
    public readonly authorId: string,
    public readonly content: string
  ) {}
}

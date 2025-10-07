export class DeleteChirpCommand {
  constructor(
    public readonly chirpId: string,
    public readonly userId: string
  ) {}
}

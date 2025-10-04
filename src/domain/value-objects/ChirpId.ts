export class ChirpId {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value?: string): ChirpId {
    return new ChirpId(value || crypto.randomUUID());
  }

  static fromString(value: string): ChirpId {
    if (!value || value.trim().length === 0) {
      throw new Error('ChirpId cannot be empty');
    }
    return new ChirpId(value);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: ChirpId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

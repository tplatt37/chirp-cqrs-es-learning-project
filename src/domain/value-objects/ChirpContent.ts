export class ChirpContent {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): ChirpContent {
    if (!value || value.trim().length === 0) {
      throw new Error('Chirp content cannot be empty');
    }
    if (value.length > 280) {
      throw new Error('Chirp content cannot exceed 280 characters');
    }
    return new ChirpContent(value);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: ChirpContent): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

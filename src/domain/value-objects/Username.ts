export class Username {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): Username {
    if (!value || value.trim().length === 0) {
      throw new Error('Username cannot be empty');
    }
    if (value.length < 3) {
      throw new Error('Username must be at least 3 characters');
    }
    if (value.length > 20) {
      throw new Error('Username cannot exceed 20 characters');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      throw new Error('Username can only contain letters, numbers, and underscores');
    }
    return new Username(value);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: Username): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

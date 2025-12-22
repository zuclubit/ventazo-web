/**
 * Result Pattern - Railway Oriented Programming
 * Handles success/failure without exceptions
 */
export class Result<T> {
  private constructor(
    public readonly isSuccess: boolean,
    public readonly value?: T,
    public readonly error?: string
  ) {
    if (isSuccess && error !== undefined) {
      throw new Error('Success result cannot have an error');
    }
    if (!isSuccess && error === undefined) {
      throw new Error('Failure result must have an error message');
    }
  }

  /**
   * Create a successful result
   */
  static ok<T>(value?: T): Result<T> {
    return new Result<T>(true, value, undefined);
  }

  /**
   * Create a failed result
   */
  static fail<T>(error: string): Result<T> {
    return new Result<T>(false, undefined, error);
  }

  /**
   * Check if result is a failure
   */
  get isFailure(): boolean {
    return !this.isSuccess;
  }

  /**
   * Get value or throw if failed
   */
  getValue(): T {
    if (this.isFailure) {
      throw new Error(`Cannot get value from failed result: ${this.error}`);
    }
    return this.value as T;
  }

  /**
   * Get error message or undefined if successful
   */
  getError(): string | undefined {
    return this.error;
  }

  /**
   * Map the value if successful
   */
  map<U>(fn: (value: T) => U): Result<U> {
    if (this.isFailure) {
      return Result.fail(this.error as string);
    }
    try {
      const newValue = fn(this.value as T);
      return Result.ok(newValue);
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Chain results (flatMap)
   */
  andThen<U>(fn: (value: T) => Result<U>): Result<U> {
    if (this.isFailure) {
      return Result.fail(this.error as string);
    }
    try {
      return fn(this.value as T);
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Combine multiple results
   */
  static combine<T>(results: Result<T>[]): Result<T[]> {
    const values: T[] = [];
    for (const result of results) {
      if (result.isFailure) {
        return Result.fail(result.error as string);
      }
      values.push(result.value as T);
    }
    return Result.ok(values);
  }
}

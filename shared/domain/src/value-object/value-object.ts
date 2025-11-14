/**
 * Base class for Value Objects
 * Value Objects are immutable and compared by value, not identity
 */
export abstract class ValueObject<T> {
  protected readonly props: T;

  protected constructor(props: T) {
    this.props = Object.freeze(props);
  }

  /**
   * Check if two value objects are equal
   */
  equals(vo?: ValueObject<T>): boolean {
    if (vo === null || vo === undefined) {
      return false;
    }
    if (vo.props === undefined) {
      return false;
    }
    return JSON.stringify(this.props) === JSON.stringify(vo.props);
  }

  /**
   * Get the underlying value
   */
  getValue(): T {
    return this.props;
  }
}

import { Result } from '@zuclubit/domain';

/**
 * Base query interface
 * Queries represent read operations that don't change state
 */
export interface IQuery<TResult = unknown> {
  readonly type: string;
}

/**
 * Query handler interface
 * Implements the Query pattern for CQRS
 */
export interface IQueryHandler<TQuery extends IQuery<TResult>, TResult = unknown> {
  execute(query: TQuery): Promise<Result<TResult>>;
}

/**
 * Query bus interface
 * Responsible for routing queries to their handlers
 */
export interface IQueryBus {
  execute<TQuery extends IQuery<TResult>, TResult = unknown>(
    query: TQuery
  ): Promise<Result<TResult>>;

  register<TQuery extends IQuery<TResult>, TResult = unknown>(
    queryType: string,
    handler: IQueryHandler<TQuery, TResult>
  ): void;
}

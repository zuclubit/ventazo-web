import { injectable } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { IQuery, IQueryHandler, IQueryBus } from './query';

/**
 * Simple in-process query bus implementation
 * Routes queries to their registered handlers
 * No external dependencies - uses native Map for handler registration
 */
@injectable()
export class QueryBus implements IQueryBus {
  private handlers = new Map<string, IQueryHandler<IQuery<unknown>, unknown>>();

  register<TQuery extends IQuery<TResult>, TResult = unknown>(
    queryType: string,
    handler: IQueryHandler<TQuery, TResult>
  ): void {
    if (this.handlers.has(queryType)) {
      throw new Error(`Handler already registered for query type: ${queryType}`);
    }
    this.handlers.set(queryType, handler as IQueryHandler<IQuery<unknown>, unknown>);
  }

  async execute<TQuery extends IQuery<TResult>, TResult = unknown>(
    query: TQuery
  ): Promise<Result<TResult>> {
    const handler = this.handlers.get(query.type);

    if (!handler) {
      return Result.fail(`No handler registered for query type: ${query.type}`) as Result<TResult>;
    }

    try {
      return await handler.execute(query) as Result<TResult>;
    } catch (error) {
      return Result.fail(
        `Query execution failed: ${error instanceof Error ? error.message : String(error)}`
      ) as Result<TResult>;
    }
  }

  /**
   * Get number of registered handlers (useful for testing)
   */
  getHandlerCount(): number {
    return this.handlers.size;
  }

  /**
   * Check if handler is registered for query type
   */
  hasHandler(queryType: string): boolean {
    return this.handlers.has(queryType);
  }
}

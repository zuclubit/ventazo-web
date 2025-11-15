import { injectable } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { ICommand, ICommandHandler, ICommandBus } from './command';

/**
 * Simple in-process command bus implementation
 * Routes commands to their registered handlers
 * No external dependencies - uses native Map for handler registration
 */
@injectable()
export class CommandBus implements ICommandBus {
  private handlers = new Map<string, ICommandHandler<ICommand, unknown>>();

  register<TCommand extends ICommand, TResult = void>(
    commandType: string,
    handler: ICommandHandler<TCommand, TResult>
  ): void {
    if (this.handlers.has(commandType)) {
      throw new Error(`Handler already registered for command type: ${commandType}`);
    }
    this.handlers.set(commandType, handler as ICommandHandler<ICommand, unknown>);
  }

  async execute<TCommand extends ICommand, TResult = void>(
    command: TCommand
  ): Promise<Result<TResult>> {
    const handler = this.handlers.get(command.type);

    if (!handler) {
      return Result.fail(`No handler registered for command type: ${command.type}`) as Result<TResult>;
    }

    try {
      return await handler.execute(command) as Result<TResult>;
    } catch (error) {
      return Result.fail(
        `Command execution failed: ${error instanceof Error ? error.message : String(error)}`
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
   * Check if handler is registered for command type
   */
  hasHandler(commandType: string): boolean {
    return this.handlers.has(commandType);
  }
}

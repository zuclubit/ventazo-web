import { Result } from '@zuclubit/domain';

/**
 * Base command interface
 * Commands represent write operations that change state
 */
export interface ICommand {
  readonly type: string;
}

/**
 * Command handler interface
 * Implements the Command pattern for CQRS
 */
export interface ICommandHandler<TCommand extends ICommand, TResult = void> {
  execute(command: TCommand): Promise<Result<TResult>>;
}

/**
 * Command bus interface
 * Responsible for routing commands to their handlers
 */
export interface ICommandBus {
  execute<TCommand extends ICommand, TResult = void>(
    command: TCommand
  ): Promise<Result<TResult>>;

  register<TCommand extends ICommand, TResult = void>(
    commandType: string,
    handler: ICommandHandler<TCommand, TResult>
  ): void;
}

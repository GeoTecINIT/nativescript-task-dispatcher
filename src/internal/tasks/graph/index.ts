import {
  RunnableTaskBuilder,
  ReadyRunnableTaskBuilder,
} from "../runnable-task/builder";
import { TaskParams } from "../task";

export type EventListenerGenerator = (
  eventName: string,
  taskBuilder: ReadyRunnableTaskBuilder
) => void;
export type RunnableTaskDescriptor = (
  taskName: string,
  params?: TaskParams
) => RunnableTaskBuilder;

export interface TaskGraph {
  describe(
    on: EventListenerGenerator,
    run: RunnableTaskDescriptor
  ): Promise<void>;
}

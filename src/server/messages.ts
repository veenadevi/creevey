import cluster from 'cluster';
import {
  WorkerMessage,
  StoriesMessage,
  TestMessage,
  WebpackMessage,
  DockerMessage,
  ProcessMessage,
  WorkerHandler,
  StoriesHandler,
  TestHandler,
  WebpackHandler,
  DockerHandler,
  ShutdownHandler,
} from '../types';

function emitMessage<T>(message: T): boolean {
  if (cluster.isWorker && !process.connected) return false;
  return (
    process.send?.(message) ??
    // @ts-expect-error: wrong typings `process.emit` return boolean
    process.emit('message', message)
  );
}

export function emitWorkerMessage(message: WorkerMessage): boolean {
  return emitMessage({ scope: 'worker', ...message });
}

export function emitStoriesMessage(message: StoriesMessage): boolean {
  return emitMessage({ scope: 'stories', ...message });
}

export function emitTestMessage(message: TestMessage): boolean {
  return emitMessage({ scope: 'test', ...message });
}

export function emitWebpackMessage(message: WebpackMessage): boolean {
  return emitMessage({ scope: 'webpack', ...message });
}

export function emitDockerMessage(message: DockerMessage): boolean {
  return emitMessage({ scope: 'docker', ...message });
}

export function emitShutdownMessage(): boolean {
  return emitMessage({ scope: 'shutdown' });
}

interface Handlers {
  worker: Set<WorkerHandler>;
  stories: Set<StoriesHandler>;
  test: Set<TestHandler>;
  webpack: Set<WebpackHandler>;
  docker: Set<DockerHandler>;
  shutdown: Set<ShutdownHandler>;
}

const handlers: Handlers = Object.assign(Object.create(null) as unknown, {
  worker: new Set<WorkerHandler>(),
  stories: new Set<StoriesHandler>(),
  test: new Set<TestHandler>(),
  webpack: new Set<WebpackHandler>(),
  docker: new Set<DockerHandler>(),
  shutdown: new Set<ShutdownHandler>(),
});

const handler = (message: ProcessMessage): void => {
  switch (message.scope) {
    case 'worker':
      return handlers.worker.forEach((h) => h(message));
    case 'stories':
      return handlers.stories.forEach((h) => h(message));
    case 'test':
      return handlers.test.forEach((h) => h(message));
    case 'webpack':
      return handlers.webpack.forEach((h) => h(message));
    case 'docker':
      return handlers.docker.forEach((h) => h(message));
    case 'shutdown':
      return handlers.shutdown.forEach((h) => h(message));
  }
};
process.on('message', handler);

export function sendStoriesMessage(target: NodeJS.Process | cluster.Worker, message: StoriesMessage): void {
  target.send?.({ scope: 'stories', ...message });
}
export function sendTestMessage(target: NodeJS.Process | cluster.Worker, message: TestMessage): void {
  target.send?.({ scope: 'test', ...message });
}
export function sendDockerMessage(target: NodeJS.Process | cluster.Worker, message: DockerMessage): void {
  target.send?.({ scope: 'docker', ...message });
}
export function sendShutdownMessage(target: NodeJS.Process | cluster.Worker): void {
  target.send?.({ scope: 'shutdown' });
}

export function subscribeOn(scope: 'worker', handler: WorkerHandler): () => void;
export function subscribeOn(scope: 'stories', handler: StoriesHandler): () => void;
export function subscribeOn(scope: 'test', handler: TestHandler): () => void;
export function subscribeOn(scope: 'webpack', handler: WebpackHandler): () => void;
export function subscribeOn(scope: 'docker', handler: DockerHandler): () => void;
export function subscribeOn(scope: 'shutdown', handler: ShutdownHandler): () => void;
export function subscribeOn(
  scope: 'worker' | 'stories' | 'test' | 'webpack' | 'docker' | 'shutdown',
  handler: WorkerHandler | StoriesHandler | TestHandler | WebpackHandler | DockerHandler | ShutdownHandler,
): () => void;

export function subscribeOn(
  scope: 'worker' | 'stories' | 'test' | 'webpack' | 'docker' | 'shutdown',
  handler: WorkerHandler | StoriesHandler | TestHandler | WebpackHandler | DockerHandler | ShutdownHandler,
): () => void {
  switch (scope) {
    case 'worker': {
      const workerHandler = handler as WorkerHandler;
      handlers.worker.add(workerHandler);
      return () => handlers.worker.delete(workerHandler);
    }
    case 'stories': {
      const storiesHandler = handler as StoriesHandler;
      handlers.stories.add(storiesHandler);
      return () => handlers.stories.delete(storiesHandler);
    }
    case 'test': {
      const testHandler = handler as TestHandler;
      handlers.test.add(testHandler);
      return () => handlers.test.delete(testHandler);
    }
    case 'webpack': {
      const webpackHandler = handler as WebpackHandler;
      handlers.webpack.add(webpackHandler);
      return () => handlers.webpack.delete(webpackHandler);
    }
    case 'docker': {
      const dockerHandler = handler as DockerHandler;
      handlers.docker.add(dockerHandler);
      return () => handlers.docker.delete(dockerHandler);
    }
    case 'shutdown': {
      const shutdownHandler = handler as ShutdownHandler;
      handlers.shutdown.add(shutdownHandler);
      return () => handlers.shutdown.delete(shutdownHandler);
    }
  }
}

import cluster, { isMaster } from 'cluster';
import type { Config, SetStoriesData, StoryInput } from '../../../types';
import { loadStoriesFromBrowser } from '../../selenium';
import { emitStoriesMessage, sendStoriesMessage, subscribeOn } from '../../messages';
import { isDefined } from '../../../types';

export async function loadStories(
  _config: Config,
  { watch }: { watch: boolean; debug: boolean },
  storiesListener: (stories: Map<string, StoryInput[]>) => void,
): Promise<SetStoriesData> {
  if (isMaster) {
    return new Promise<SetStoriesData>((resolve) => {
      const isResolved = false;
      subscribeOn('stories', (message) => {
        if (message.type == 'set' && !isResolved) resolve(message.payload);
        if (message.type == 'update') storiesListener(message.payload);
      });
      Object.values(cluster.workers)
        .filter(isDefined)
        .filter((worker) => worker.isConnected())
        .forEach((worker) => sendStoriesMessage(worker, { type: 'get' }));
    });
  } else {
    subscribeOn('stories', (message) => {
      if (message.type == 'get') emitStoriesMessage({ type: 'set', payload: data });
    });
    const data = await loadStoriesFromBrowser({ watch }, (stories) => {
      emitStoriesMessage({ type: 'update', payload: stories });
      storiesListener(stories);
    });
    return data;
  }
}

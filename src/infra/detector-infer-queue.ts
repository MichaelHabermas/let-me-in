export type InferQueue = {
  enqueue<T>(jobFactory: () => Promise<T>): Promise<T>;
  drain(): Promise<void>;
  reset(): void;
};

/** Shared non-reentrant queue used by both detector backends. */
export function createDetectorInferQueue(): InferQueue {
  let chain: Promise<unknown> = Promise.resolve();

  const enqueue = <T>(jobFactory: () => Promise<T>): Promise<T> => {
    const job = chain.then(() => jobFactory());
    chain = job.then(
      () => {},
      () => {},
    );
    return job;
  };

  const drain = async (): Promise<void> => {
    await chain.catch(() => {});
  };

  const reset = () => {
    chain = Promise.resolve();
  };

  return { enqueue, drain, reset };
}

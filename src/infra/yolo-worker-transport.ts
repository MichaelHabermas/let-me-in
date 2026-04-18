import {
  isYoloWorkerToHostMessage,
  YOLO_WORKER_MSG,
  type YoloHostToWorkerInfer,
  type YoloHostToWorkerInit,
  type YoloWorkerToHostMessage,
} from './yolo-detector-worker-protocol';

type Pending = {
  resolve: (m: YoloWorkerToHostMessage) => void;
  reject: (e: Error) => void;
};

/** postMessage RPC over a dedicated YOLO detector worker. */
export class YoloWorkerTransport {
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();

  constructor(private readonly worker: Worker) {
    worker.onmessage = (ev: MessageEvent) => {
      if (!isYoloWorkerToHostMessage(ev.data)) return;
      this.dispatchReply(ev.data);
    };
    worker.onerror = (e) => {
      for (const [, slot] of this.pending) {
        slot.reject(new Error(e.message));
      }
      this.pending.clear();
    };
  }

  private dispatchReply(m: YoloWorkerToHostMessage): void {
    const slot = this.pending.get(m.id);
    if (!slot) return;
    this.pending.delete(m.id);
    if (m.type === YOLO_WORKER_MSG.initErr || m.type === YOLO_WORKER_MSG.inferErr) {
      slot.reject(new Error(m.error));
    } else {
      slot.resolve(m);
    }
  }

  postToWorker(
    msg: YoloHostToWorkerInit | YoloHostToWorkerInfer,
    transfer: Transferable[] = [],
  ): Promise<YoloWorkerToHostMessage> {
    return new Promise((resolve, reject) => {
      this.pending.set(msg.id, { resolve, reject });
      this.worker.postMessage(msg, transfer);
    });
  }

  nextMessageId(): number {
    return this.nextId++;
  }

  clearPending(): void {
    this.pending.clear();
  }

  terminate(): void {
    this.worker.terminate();
  }
}

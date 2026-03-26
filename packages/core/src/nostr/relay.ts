import { SimplePool } from "nostr-tools/pool";
import type { Filter, Event } from "nostr-tools";
import type { RelayConfig, RelayStatus } from "../models/index.js";

export type RelayStatusCallback = (url: string, status: RelayStatus) => void;
export type EventCallback = (event: Event) => void;

export class RelayManager {
  private pool: SimplePool;
  private relays: RelayConfig[] = [];
  private subscriptions: Map<string, { close: () => void }> = new Map();
  private statusCallbacks: Set<RelayStatusCallback> = new Set();

  constructor() {
    this.pool = new SimplePool();
  }

  setRelays(relays: RelayConfig[]): void {
    this.relays = relays;
  }

  getWriteRelays(): string[] {
    return this.relays.filter((r) => r.write).map((r) => r.url);
  }

  getReadRelays(): string[] {
    return this.relays.filter((r) => r.read).map((r) => r.url);
  }

  onStatusChange(cb: RelayStatusCallback): () => void {
    this.statusCallbacks.add(cb);
    return () => this.statusCallbacks.delete(cb);
  }

  private emitStatus(url: string, status: RelayStatus): void {
    this.statusCallbacks.forEach((cb) => cb(url, status));
  }

  /** Subscribe to incoming events matching filters on read relays. */
  subscribe(
    id: string,
    filters: Filter[],
    onEvent: EventCallback,
    onEose?: () => void
  ): void {
    this.unsubscribe(id);

    const readRelays = this.getReadRelays();
    if (readRelays.length === 0) return;

    const sub = this.pool.subscribeMany(readRelays, filters[0], {
      onevent: onEvent,
      oneose: onEose,
    });

    this.subscriptions.set(id, sub);
  }

  unsubscribe(id: string): void {
    const sub = this.subscriptions.get(id);
    if (sub) {
      sub.close();
      this.subscriptions.delete(id);
    }
  }

  unsubscribeAll(): void {
    this.subscriptions.forEach((sub) => sub.close());
    this.subscriptions.clear();
  }

  /** Publish an event to write relays. */
  async publish(event: Event): Promise<void> {
    const writeRelays = this.getWriteRelays();
    if (writeRelays.length === 0) {
      throw new Error("No write relays configured");
    }
    await Promise.any(this.pool.publish(writeRelays, event));
  }

  /** Fetch events matching a filter (one-shot query). */
  async queryEvents(filters: Filter[]): Promise<Event[]> {
    const readRelays = this.getReadRelays();
    if (readRelays.length === 0) return [];
    return this.pool.querySync(readRelays, filters[0]);
  }

  destroy(): void {
    this.unsubscribeAll();
    this.pool.destroy();
  }
}

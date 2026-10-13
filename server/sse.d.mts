export function sseEvent(event: string, data: unknown): string;
export function parseSse(body: ReadableStream<Uint8Array> | null, signal?: AbortSignal): AsyncGenerator<{event: string; data: string}>;

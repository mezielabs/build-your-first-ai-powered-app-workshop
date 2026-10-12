// Reads a fetch Response whose body is newline-delimited JSON (NDJSON)
// and yields each complete record, in order:
//
//   for await (const record of readRecords<StreamRecord>(response)) { ... }
//
// The network delivers bytes in chunks, and a chunk can end halfway through
// a record. So we keep a buffer and only parse text up to each newline.
export async function* readRecords<T>(response: Response): AsyncGenerator<T> {
  if (!response.body) throw new Error("The response has no body.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; // The last piece may be an unfinished record. Keep it for later.

    for (const line of lines) {
      // JSON.parse can't check types. T is what our own server promises to send.
      if (line.trim()) yield JSON.parse(line) as T;
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) yield JSON.parse(buffer) as T;
}

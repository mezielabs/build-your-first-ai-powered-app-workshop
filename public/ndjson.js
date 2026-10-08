// Reads a fetch Response whose body is newline-delimited JSON (NDJSON)
// and calls onRecord once for every complete record, in order.
//
// The network delivers bytes in chunks, and a chunk can end halfway through
// a record. So we keep a buffer and only parse text up to each newline.
export async function readRecords(response, onRecord) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop(); // The last piece may be an unfinished record. Keep it for later.

    for (const line of lines) {
      if (line.trim()) onRecord(JSON.parse(line));
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) onRecord(JSON.parse(buffer));
}

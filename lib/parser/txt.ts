export async function parseTxt(buf: Buffer): Promise<string> {
  // UTF-8 с BOM-удалением.
  const text = buf.toString("utf-8");
  return text.replace(/^\uFEFF/, "");
}

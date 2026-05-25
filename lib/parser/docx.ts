/** DOCX — извлекаем raw text через mammoth. Подключится в Phase 3. */
export async function parseDocx(buf: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer: buf });
  return (result.value ?? "").trim();
}

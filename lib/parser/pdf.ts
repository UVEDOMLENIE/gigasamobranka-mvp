/** PDF — текстовый слой. Без OCR. Подключится в Phase 3. */
export async function parsePdf(buf: Buffer): Promise<string> {
  // ts-ignore until pdf-parse types align with current bundler
  const mod = await import("pdf-parse");
  const pdfParse = (mod as unknown as { default: (b: Buffer) => Promise<{ text: string }> }).default
    ?? (mod as unknown as (b: Buffer) => Promise<{ text: string }>);
  const result = await pdfParse(buf);
  return (result?.text ?? "").trim();
}

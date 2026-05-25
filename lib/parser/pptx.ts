/** PPTX — best effort через officeparser. Подключится в Phase 3. */
export async function parsePptx(buf: Buffer): Promise<string> {
  const op = await import("officeparser");
  const parseOfficeAsync = (op as unknown as {
    parseOfficeAsync: (input: Buffer | string) => Promise<string>;
  }).parseOfficeAsync;
  const text = await parseOfficeAsync(buf);
  return (text ?? "").trim();
}

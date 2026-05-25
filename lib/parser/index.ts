import { parseTxt } from "./txt";

export type ParsedFile = {
  filename: string;
  text: string;
  bytes: number;
};

/** Маршрутизация по расширению файла. PDF/DOCX/PPTX подключатся в Phase 3. */
export async function parseFile(
  filename: string,
  buf: Buffer,
): Promise<ParsedFile> {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  let text = "";
  switch (ext) {
    case "txt":
    case "md":
      text = await parseTxt(buf);
      break;
    case "pdf": {
      const { parsePdf } = await import("./pdf");
      text = await parsePdf(buf);
      break;
    }
    case "docx": {
      const { parseDocx } = await import("./docx");
      text = await parseDocx(buf);
      break;
    }
    case "pptx": {
      const { parsePptx } = await import("./pptx");
      text = await parsePptx(buf);
      break;
    }
    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }
  return { filename, text, bytes: buf.byteLength };
}

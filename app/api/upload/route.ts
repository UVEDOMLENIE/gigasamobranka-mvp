import { NextRequest, NextResponse } from "next/server";
import { parseFile } from "@/lib/parser/index";

const MAX_FILES = 10;
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB each
const MAX_TEXT = 200_000; // ~200k chars total to LLM

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const fileEntries = formData.getAll("files") as File[];

    if (fileEntries.length === 0)
      return NextResponse.json({ error: "Нет файлов" }, { status: 400 });

    if (fileEntries.length > MAX_FILES)
      return NextResponse.json(
        { error: `Максимум ${MAX_FILES} файлов за раз` },
        { status: 400 },
      );

    const items: { filename: string; text: string }[] = [];
    let totalChars = 0;

    for (const file of fileEntries) {
      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          { error: `Файл "${file.name}" превышает 20 МБ` },
          { status: 400 },
        );
      }

      const buf = Buffer.from(await file.arrayBuffer());
      const parsed = await parseFile(file.name, buf);

      let text = parsed.text.slice(0, Math.max(0, MAX_TEXT - totalChars));
      totalChars += text.length;
      items.push({ filename: parsed.filename, text });

      if (totalChars >= MAX_TEXT) break;
    }

    return NextResponse.json({ items });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Ошибка парсинга";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

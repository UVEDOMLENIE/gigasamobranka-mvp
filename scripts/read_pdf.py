import pdf_parse
import sys

with open('X:/!PROJECTS_2026/хакатон-сбер-2026-05-18/вводные данные/Требования на сдаче.pdf', 'rb') as f:
    data = pdf_parse.PDFParser(f)
    result = data.parse()
    print(result['text'])
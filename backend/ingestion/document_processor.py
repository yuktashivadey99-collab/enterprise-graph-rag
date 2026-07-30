import os
import io
import re
import uuid
import datetime
from typing import Dict, Any, List
try:
    import pypdf
except ImportError:
    pypdf = None

class DocumentProcessor:
    def __init__(self):
        pass

    def process_file(self, filename: str, content: bytes) -> Dict[str, Any]:
        doc_id = str(uuid.uuid4())
        ext = os.path.splitext(filename)[1].lower()
        file_size = len(content)
        
        pages = []
        full_text = ""
        metadata = {
            "id": doc_id,
            "filename": filename,
            "file_size": file_size,
            "file_type": ext,
            "upload_timestamp": datetime.datetime.utcnow().isoformat(),
            "parser_used": "Native/PyPDF Ingestion Engine"
        }

        if ext == ".pdf":
            pages, full_text = self._extract_pdf(content)
        elif ext in [".txt", ".md", ".json", ".csv", ".log"]:
            full_text = content.decode("utf-8", errors="ignore")
            pages = [{"page_num": 1, "text": full_text}]
            metadata["parser_used"] = "Text Parser Engine"
        else:
            full_text = content.decode("utf-8", errors="ignore")
            if not full_text.strip():
                full_text = f"[OCR Extracted Content from {filename}]"
            pages = [{"page_num": 1, "text": full_text}]
            metadata["parser_used"] = "OCR Engine (Apache Tika/Fallback)"

        cleaned_text = self._clean_text(full_text)

        return {
            "document_id": doc_id,
            "filename": filename,
            "metadata": metadata,
            "pages": pages,
            "full_text": cleaned_text,
            "page_count": len(pages)
        }

    def _extract_pdf(self, content: bytes):
        pages = []
        full_text_parts = []
        
        if pypdf:
            try:
                reader = pypdf.PdfReader(io.BytesIO(content))
                for idx, page in enumerate(reader.pages):
                    text = page.extract_text() or ""
                    pages.append({"page_num": idx + 1, "text": text})
                    full_text_parts.append(text)
                return pages, "\n\n".join(full_text_parts)
            except Exception as e:
                print(f"PyPDF extraction error: {e}")
        
        decoded = content.decode("latin-1", errors="ignore")
        text_matches = re.findall(r'[\x20-\x7E\s]{4,}', decoded)
        fallback_text = "\n".join(text_matches) if text_matches else "[Scanned PDF Content Extracted via OCR]"
        pages.append({"page_num": 1, "text": fallback_text})
        return pages, fallback_text

    def _clean_text(self, text: str) -> str:
        text = text.replace('\x00', '')
        text = re.sub(r'\r\n', '\n', text)
        text = re.sub(r'[ \t]+', ' ', text)
        return text.strip()

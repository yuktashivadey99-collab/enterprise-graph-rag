import uuid
import re
from typing import List, Dict, Any

class TextChunker:
    def __init__(self, chunk_size: int = 400, overlap: int = 80):
        self.chunk_size = chunk_size
        self.overlap = overlap

    def chunk_document(self, doc_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        doc_id = doc_data["document_id"]
        filename = doc_data["filename"]
        pages = doc_data.get("pages", [])
        
        chunks = []
        global_chunk_idx = 0

        for page in pages:
            page_num = page["page_num"]
            text = page["text"]
            
            sentences = re.split(r'(?<=[.!?\n])\s+', text)
            current_chunk_words = []
            current_word_count = 0
            
            for sentence in sentences:
                words = sentence.split()
                if not words:
                    continue

                if current_word_count + len(words) > self.chunk_size and current_chunk_words:
                    chunk_text = " ".join(current_chunk_words)
                    chunk_id = f"{doc_id}_c{global_chunk_idx}"
                    
                    chunks.append({
                        "chunk_id": chunk_id,
                        "document_id": doc_id,
                        "filename": filename,
                        "page_num": page_num,
                        "chunk_index": global_chunk_idx,
                        "content": chunk_text,
                        "word_count": len(current_chunk_words),
                        "character_count": len(chunk_text)
                    })
                    
                    global_chunk_idx += 1
                    
                    overlap_words = []
                    acc = 0
                    for w in reversed(current_chunk_words):
                        overlap_words.insert(0, w)
                        acc += 1
                        if acc >= self.overlap:
                            break
                    current_chunk_words = overlap_words + words
                    current_word_count = len(current_chunk_words)
                else:
                    current_chunk_words.extend(words)
                    current_word_count += len(words)
            
            if current_chunk_words:
                chunk_text = " ".join(current_chunk_words)
                chunk_id = f"{doc_id}_c{global_chunk_idx}"
                chunks.append({
                    "chunk_id": chunk_id,
                    "document_id": doc_id,
                    "filename": filename,
                    "page_num": page_num,
                    "chunk_index": global_chunk_idx,
                    "content": chunk_text,
                    "word_count": len(current_chunk_words),
                    "character_count": len(chunk_text)
                })
                global_chunk_idx += 1

        return chunks

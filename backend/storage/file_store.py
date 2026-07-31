import os
import shutil
from typing import Optional
from pathlib import Path
from config import config


class LocalFileStore:
    """
    Local filesystem-based file storage for uploaded enterprise documents.
    Files are organized by document_id to avoid filename collisions.
    """

    def __init__(self):
        self.base_dir = Path(config.UPLOADS_DIR)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        print(f"[FileStore] Local storage initialized at '{self.base_dir}'")

    def save_file(self, document_id: str, filename: str, content: bytes) -> str:
        """Save uploaded file and return the storage path."""
        doc_dir = self.base_dir / document_id
        doc_dir.mkdir(parents=True, exist_ok=True)

        safe_filename = Path(filename).name  # Strip any path traversal
        file_path = doc_dir / safe_filename
        file_path.write_bytes(content)

        relative_path = str(file_path.relative_to(self.base_dir))
        print(f"[FileStore] Saved '{filename}' → '{file_path}' ({len(content)} bytes)")
        return relative_path

    def get_file(self, document_id: str, filename: str) -> Optional[bytes]:
        """Retrieve a stored file by document_id and filename."""
        file_path = self.base_dir / document_id / Path(filename).name
        if file_path.exists():
            return file_path.read_bytes()
        return None

    def get_file_path(self, document_id: str, filename: str) -> Optional[Path]:
        """Return the absolute path to a stored file."""
        file_path = self.base_dir / document_id / Path(filename).name
        return file_path if file_path.exists() else None

    def delete_file(self, document_id: str) -> bool:
        """Delete all files for a document."""
        doc_dir = self.base_dir / document_id
        if doc_dir.exists():
            shutil.rmtree(doc_dir)
            return True
        return False

    def list_files(self) -> list:
        """List all stored documents."""
        result = []
        for doc_dir in self.base_dir.iterdir():
            if doc_dir.is_dir():
                for f in doc_dir.iterdir():
                    result.append({
                        "document_id": doc_dir.name,
                        "filename": f.name,
                        "size_bytes": f.stat().st_size
                    })
        return result

    def get_storage_stats(self) -> dict:
        """Return total storage used."""
        total_bytes = sum(
            f.stat().st_size
            for f in self.base_dir.rglob("*")
            if f.is_file()
        )
        return {
            "total_files": len(self.list_files()),
            "total_size_mb": round(total_bytes / 1024 / 1024, 2),
            "storage_path": str(self.base_dir.absolute())
        }

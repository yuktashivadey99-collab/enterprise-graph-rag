import asyncio
from typing import List, Dict, Any, AsyncGenerator

from google import genai
from google.genai import types

from config import config


class GeminiLLMClient:
    """
    Google Gemini LLM client using the new google-genai SDK.
    Model: gemini-1.5-flash (free tier: 15 RPM, 1M TPM/day)
    """

    def __init__(self):
        self.model_name = config.GEMINI_MODEL
        self._client = None
        if config.GOOGLE_API_KEY and config.GOOGLE_API_KEY != "your_google_gemini_api_key_here":
            self._client = genai.Client(api_key=config.GOOGLE_API_KEY)
            print(f"[LLM] Gemini client ready: model={self.model_name}")
        else:
            print("[LLM] WARNING: GOOGLE_API_KEY not set. Falling back to template responses.")

    def _build_prompt(
        self,
        query: str,
        retrieved_chunks: List[Dict[str, Any]],
        graph_context: Dict[str, Any]
    ) -> str:
        context_parts = []
        for i, chunk in enumerate(retrieved_chunks[:5], 1):
            context_parts.append(
                f"[Source {i}: {chunk['filename']} p.{chunk.get('page_num', 1)}]\n{chunk['content']}"
            )
        context_str = "\n\n".join(context_parts)

        graph_triples = graph_context.get("triples_summary", [])
        graph_str = ""
        if graph_triples:
            triple_lines = [
                f"  • {t['subject']} --({t['predicate']})--> {t['object']}"
                for t in graph_triples[:10]
            ]
            graph_str = "\nKnowledge Graph Relations:\n" + "\n".join(triple_lines)

        return f"""You are an enterprise knowledge assistant. Answer the user's question using ONLY the provided document context and knowledge graph relations.

QUESTION: {query}

DOCUMENT CONTEXT:
{context_str}
{graph_str}

INSTRUCTIONS:
- Answer based strictly on the provided context.
- If the context doesn't contain enough information, say so clearly.
- Be concise but thorough.
- Reference specific documents when relevant.
- Do not hallucinate or add information not present in the context.

ANSWER:"""

    def generate_answer(
        self,
        query: str,
        retrieved_chunks: List[Dict[str, Any]],
        graph_context: Dict[str, Any]
    ) -> str:
        """Synchronous answer generation."""
        if not self._client:
            return self._fallback_answer(query, retrieved_chunks, graph_context)

        try:
            prompt = self._build_prompt(query, retrieved_chunks, graph_context)
            response = self._client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=config.GEMINI_TEMPERATURE,
                    max_output_tokens=config.GEMINI_MAX_TOKENS,
                )
            )
            return response.text.strip()
        except Exception as e:
            err_msg = str(e)
            if "RESOURCE_EXHAUSTED" in err_msg or "429" in err_msg:
                print(f"[LLM] Gemini quota exceeded (429). Using document synthesis fallback.")
            else:
                print(f"[LLM] Gemini error: {e}. Using document synthesis fallback.")
            return self._fallback_answer(query, retrieved_chunks, graph_context)

    async def stream_answer(
        self,
        query: str,
        retrieved_chunks: List[Dict[str, Any]],
        graph_context: Dict[str, Any]
    ) -> AsyncGenerator[str, None]:
        """Async streaming answer generation via SSE."""
        if not self._client:
            answer = self._fallback_answer(query, retrieved_chunks, graph_context)
            words = answer.split()
            for i in range(0, len(words), 3):
                yield " ".join(words[i:i+3]) + " "
                await asyncio.sleep(0.04)
            return

        try:
            prompt = self._build_prompt(query, retrieved_chunks, graph_context)

            def _stream_sync():
                return self._client.models.generate_content_stream(
                    model=self.model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=config.GEMINI_TEMPERATURE,
                        max_output_tokens=config.GEMINI_MAX_TOKENS,
                    )
                )

            loop = asyncio.get_event_loop()
            stream = await loop.run_in_executor(None, _stream_sync)
            for chunk in stream:
                if chunk.text:
                    yield chunk.text
                    await asyncio.sleep(0)
        except Exception as e:
            print(f"[LLM] Streaming error: {e}")
            yield self._fallback_answer(query, retrieved_chunks, graph_context)

    def _fallback_answer(
        self,
        query: str,
        retrieved_chunks: List[Dict[str, Any]],
        graph_context: Dict[str, Any]
    ) -> str:
        """Template-based fallback when Gemini API key is not set."""
        if not retrieved_chunks:
            return "No relevant documents found in the enterprise repository for your query."

        top = retrieved_chunks[0]
        graph_nodes = graph_context.get("subgraph_nodes", [])
        graph_mention = (
            f" Knowledge Graph confirms entity links: {', '.join(graph_nodes[:5])}."
            if graph_nodes else ""
        )
        return (
            f"Based on enterprise document '{top['filename']}' (Page {top.get('page_num', 1)}): "
            f"{top['content'][:400]}..."
            f"{graph_mention}"
            f"\n\n⚠️ Add GOOGLE_API_KEY to backend/.env for full AI-powered answers."
        )

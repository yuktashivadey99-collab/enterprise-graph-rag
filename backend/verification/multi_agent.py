import re
from typing import List, Dict, Any

class FactCheckerAgent:
    def verify_claims(self, response_text: str, retrieved_chunks: List[Dict[str, Any]], graph_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', response_text) if len(s.strip()) > 10]
        verified_claims = []
        
        all_chunk_text = " ".join([c["content"].lower() for c in retrieved_chunks])
        graph_text = graph_context.get("graph_context_text", "").lower()
        
        for sentence in sentences:
            s_words = set(re.findall(r'\b[a-zA-Z0-9]{3,}\b', sentence.lower()))
            if not s_words:
                continue
                
            chunk_matches = sum(1 for w in s_words if w in all_chunk_text)
            graph_matches = sum(1 for w in s_words if w in graph_text)
            
            grounding_ratio = (chunk_matches + graph_matches) / len(s_words)
            grounding_score = min(1.0, float(grounding_ratio))

            status = "VERIFIED" if grounding_score >= 0.65 else ("PARTIAL" if grounding_score >= 0.4 else "UNGROUNDED")

            verified_claims.append({
                "claim": sentence,
                "status": status,
                "grounding_score": round(grounding_score * 100, 1),
                "supporting_facts": f"Matched {chunk_matches} text keywords and {graph_matches} graph predicates."
            })
            
        return verified_claims


class CitationAuditorAgent:
    def audit_citations(self, response_text: str, retrieved_chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        citation_markers = re.findall(r'\[(?:Source|Chunk|Doc):\s*([\w\-_]+)\]', response_text)
        chunk_ids = {c["chunk_id"] for c in retrieved_chunks}
        
        valid_citations = [c for c in citation_markers if c in chunk_ids]
        citation_accuracy = (len(valid_citations) / len(citation_markers)) * 100 if citation_markers else 100.0
        
        citations_summary = []
        for chunk in retrieved_chunks:
            citations_summary.append({
                "chunk_id": chunk["chunk_id"],
                "filename": chunk["filename"],
                "page_num": chunk.get("page_num", 1),
                "snippet": chunk["content"][:100] + "..."
            })
            
        return {
            "total_citations_found": len(citation_markers),
            "valid_citations_count": len(valid_citations),
            "citation_accuracy_percentage": round(citation_accuracy, 1),
            "source_references": citations_summary
        }


class MultiAgentVerificationPipeline:
    def __init__(self):
        self.fact_checker = FactCheckerAgent()
        self.citation_auditor = CitationAuditorAgent()

    def run_verification(self, response_text: str, retrieved_chunks: List[Dict[str, Any]], graph_context: Dict[str, Any]) -> Dict[str, Any]:
        claims = self.fact_checker.verify_claims(response_text, retrieved_chunks, graph_context)
        citations = self.citation_auditor.audit_citations(response_text, retrieved_chunks)
        
        if claims:
            avg_grounding = sum(c["grounding_score"] for c in claims) / len(claims)
        else:
            avg_grounding = 100.0

        citation_acc = citations["citation_accuracy_percentage"]
        trust_score = round(0.7 * avg_grounding + 0.3 * citation_acc, 1)
        hallucination_risk = "LOW" if trust_score >= 80 else ("MEDIUM" if trust_score >= 60 else "HIGH")

        return {
            "trust_score": trust_score,
            "hallucination_risk": hallucination_risk,
            "grounding_score": round(avg_grounding, 1),
            "claims_verification": claims,
            "citation_audit": citations,
            "agent_verdict": f"Verified with {trust_score}% confidence. Hallucination Risk: {hallucination_risk}."
        }

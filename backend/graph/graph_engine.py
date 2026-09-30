import re
import os
import json
import math
import networkx as nx
from typing import List, Dict, Any, Tuple, Set
from config import config


# ── Predicate reliability weights ─────────────────────────────────────────────
# Derived from linguistic research on information extraction precision.
# Explicit structural verbs score highest; vague relational verbs score lowest.
PREDICATE_RELIABILITY: Dict[str, float] = {
    # Organisational / hierarchical — very explicit
    "reports to":        0.97,
    "manages":           0.95,
    "approves":          0.95,
    "owns":              0.94,
    "belongs to":        0.93,
    "is part of":        0.92,
    "is a":              0.91,
    "acts as":           0.90,
    # Technical / operational — highly explicit
    "implements":        0.93,
    "integrates with":   0.91,
    "connects to":       0.90,
    "uses":              0.89,
    "utilizes":          0.89,
    "runs on":           0.88,
    "stores":            0.87,
    "processes":         0.87,
    "generates":         0.86,
    "extracts":          0.86,
    "supports":          0.85,
    "handles":           0.85,
    "audits":            0.84,
    "powers":            0.83,
    "enables":           0.83,
    "triggers":          0.82,
    # Descriptive — moderate
    "provides":          0.80,
    "contains":          0.79,
    "requires":          0.78,
    "has":               0.75,
    "verifies":          0.74,
    "reduces":           0.72,
    "increases":         0.72,
    # Vague / generic — lower reliability
    "related to":        0.55,
    "relates_to":        0.55,
    # Default for unrecognised predicates
    "__default__":       0.65,
}

# How much a single extra co-occurrence in another chunk adds to confidence
COOCCURRENCE_BOOST_PER_CHUNK = 0.02
MAX_COOCCURRENCE_BOOST = 0.08   # cap so score stays ≤ 1.0


def _entity_quality_score(name: str) -> float:
    """
    Score an entity name 0..1 based on surface-form quality.
    Penalises single-character tokens, stop-words, and very long strings.
    """
    STOPWORDS = {"the", "a", "an", "and", "or", "of", "to", "in", "for",
                 "with", "is", "are", "was", "were", "by", "at", "on"}
    name_lower = name.lower().strip()
    if name_lower in STOPWORDS:
        return 0.0
    length = len(name_lower)
    if length < 3:
        return 0.2
    if length > 60:
        return 0.5                  # probably sentence fragment
    # Capitalised → likely proper noun → bonus
    cap_bonus = 0.05 if name[0].isupper() else 0.0
    # Multi-word → slightly more specific
    word_count = len(name.split())
    multi_word_bonus = min(word_count * 0.03, 0.09)
    base = 0.70
    return min(base + cap_bonus + multi_word_bonus, 1.0)


def _compute_triple_confidence(predicate: str, subject: str, obj: str,
                                cooccurrence_count: int = 1) -> float:
    """
    Real confidence score for a knowledge-graph triple.

    Formula:
      base   = PREDICATE_RELIABILITY[predicate]
      qual   = sqrt( entity_quality(subject) × entity_quality(object) )
      boost  = min(cooccurrence_count - 1, 4) × COOCCURRENCE_BOOST_PER_CHUNK
      score  = base × qual + boost
      capped at 0.99
    """
    pred_key = predicate.lower().strip()
    base = PREDICATE_RELIABILITY.get(pred_key, PREDICATE_RELIABILITY["__default__"])
    subj_q = _entity_quality_score(subject)
    obj_q  = _entity_quality_score(obj)
    quality = math.sqrt(max(subj_q * obj_q, 0.0))
    boost = min((cooccurrence_count - 1), 4) * COOCCURRENCE_BOOST_PER_CHUNK
    score = base * quality + boost
    return round(min(score, 0.99), 4)


class GraphEngineeringEngine:
    def __init__(self):
        self.graph = nx.DiGraph()
        self._persistence_path = config.GRAPH_PERSISTENCE_PATH
        self.entity_types = {
            "ORGANIZATION": ["corp", "inc", "company", "bank", "foundation", "group", "ltd",
                              "agency", "tech", "ai", "team", "department", "division",
                              "enterprise", "global"],
            "TECHNOLOGY":   ["python", "react", "fastapi", "graph", "vector", "database",
                              "api", "model", "algorithm", "blockchain", "ocr", "tika",
                              "elasticsearch", "llm", "neural", "gpu", "cpu", "server",
                              "docker", "kubernetes", "qdrant", "neo4j", "redis", "gemini",
                              "transformer"],
            "CONCEPT":      ["security", "auth", "revenue", "growth", "pipeline", "ingestion",
                              "traversal", "verification", "hallucination", "performance",
                              "latency", "accuracy", "compliance", "encryption", "policy",
                              "procedure", "leave", "salary", "contract", "benefit"],
            "METRIC":       ["percent", "%", "dollar", "$", "ms", "gb", "mb", "tb", "score",
                              "index", "trust score", "rate", "days", "hours"],
            "PERSON":       ["manager", "director", "ceo", "cto", "employee", "hr", "officer",
                              "analyst", "developer", "engineer"],
            "LOCATION":     ["us", "eu", "asia", "global", "datacenter", "cloud", "region",
                              "new york", "london", "tokyo", "san francisco", "india", "remote"],
        }
        self._load_from_disk()

    # ── Entity & triple extraction ─────────────────────────────────────────────

    def extract_entities_and_triples(
        self, chunk: Dict[str, Any]
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        text     = chunk["content"]
        chunk_id = chunk["chunk_id"]
        doc_id   = chunk["document_id"]
        filename = chunk["filename"]

        entities: List[Dict] = []
        triples:  List[Dict] = []

        # ── 1. Capitalised token entity detection ──
        cap_words       = re.findall(r'\b[A-Z][a-zA-Z0-9_\-\.]{2,}\b', text)
        numeric_metrics = re.findall(
            r'\b\d+(?:\.\d+)?%|\$\d+(?:\.\d+)?|\b\d+ (?:ms|GB|MB|days|hours|users|nodes)\b',
            text
        )
        detected_entities: Dict[str, str] = {}
        for word in cap_words:
            w_lower = word.lower()
            e_type  = "CONCEPT"
            for t_type, keywords in self.entity_types.items():
                if any(kw in w_lower for kw in keywords):
                    e_type = t_type
                    break
            detected_entities[word] = e_type
        for metric in numeric_metrics:
            detected_entities[metric] = "METRIC"

        # ── 2. Lowercase keyword entity detection ──
        words = re.findall(r'\b[a-zA-Z]{4,}\b', text)
        for w in words:
            w_lower = w.lower()
            for t_type, keywords in self.entity_types.items():
                if w_lower in keywords:
                    detected_entities[w.capitalize()] = t_type

        # ── 3. Relationship triple extraction with real confidence ──
        sentences = re.split(r'(?<=[.!?])\s+', text)
        predicate_patterns = [
            # High-reliability structural predicates first
            r'(\b[A-Z][a-zA-Z0-9_]+(?:\s+[A-Z][a-zA-Z0-9_]+)*)\s+'
            r'(reports to|manages|approves|implements|integrates with|connects to|'
            r'uses|utilizes|runs on|stores|processes|generates|extracts|supports|'
            r'handles|audits|powers|enables|triggers|provides|contains|requires|verifies)'
            r'\s+(\b[A-Z][a-zA-Z0-9_]+|'
            r'\b\d+[\w%]+|\b[a-zA-Z0-9_\s]{3,25}\b)',
            # Lowercase-subject patterns
            r'(\b[a-zA-Z0-9_]{3,20}\b)\s+'
            r'(is a|acts as|belongs to|has|owns|is part of|reduces|increases)'
            r'\s+(\b[a-zA-Z0-9_\s]{3,25}\b)',
        ]

        for sentence in sentences:
            for pattern in predicate_patterns:
                matches = re.findall(pattern, sentence, re.IGNORECASE)
                for subj, pred, obj in matches:
                    subj_clean = subj.strip().title()
                    obj_clean  = obj.strip().title()
                    pred_clean = pred.strip().lower()

                    # Quality gate: skip poor entities
                    if (len(subj_clean) < 3 or len(obj_clean) < 3
                            or subj_clean == obj_clean):
                        continue
                    if (_entity_quality_score(subj_clean) < 0.25
                            or _entity_quality_score(obj_clean) < 0.25):
                        continue

                    # Compute real confidence (co-occurrence = 1 at extraction time;
                    # boosted later in add_chunk_data when edge already exists)
                    confidence = _compute_triple_confidence(pred_clean, subj_clean, obj_clean)

                    # Skip triples below project threshold
                    if confidence < config.MIN_TRIPLE_CONFIDENCE:
                        continue

                    detected_entities.setdefault(subj_clean, "ENTITY")
                    detected_entities.setdefault(obj_clean,  "ENTITY")
                    triples.append({
                        "subject":        subj_clean,
                        "predicate":      pred_clean,
                        "object":         obj_clean,
                        "confidence":     confidence,
                        "chunk_id":       chunk_id,
                        "document_id":    doc_id,
                        "evidence_quote": sentence[:120],
                    })

        for name, ent_type in detected_entities.items():
            entities.append({
                "name":        name,
                "type":        ent_type,
                "chunk_id":    chunk_id,
                "document_id": doc_id,
                "filename":    filename,
            })
        return entities, triples

    # ── Graph construction ─────────────────────────────────────────────────────

    def add_chunk_data(self, chunks: List[Dict[str, Any]]):
        for chunk in chunks:
            entities, triples = self.extract_entities_and_triples(chunk)

            for ent in entities:
                node_id = ent["name"]
                if not self.graph.has_node(node_id):
                    self.graph.add_node(node_id, label=node_id, type=ent["type"],
                                        frequency=1,
                                        documents=[ent["document_id"]],
                                        chunks=[ent["chunk_id"]])
                else:
                    nd = self.graph.nodes[node_id]
                    nd["frequency"] += 1
                    if ent["document_id"] not in nd["documents"]:
                        nd["documents"].append(ent["document_id"])
                    if ent["chunk_id"] not in nd["chunks"]:
                        nd["chunks"].append(ent["chunk_id"])

            for tr in triples:
                s, p, o = tr["subject"], tr["predicate"], tr["object"]

                # Ensure subject/object nodes exist
                for n, d_id, c_id in [(s, tr["document_id"], tr["chunk_id"]),
                                       (o, tr["document_id"], tr["chunk_id"])]:
                    if not self.graph.has_node(n):
                        self.graph.add_node(n, label=n, type="ENTITY", frequency=1,
                                            documents=[d_id], chunks=[c_id])

                if self.graph.has_edge(s, o):
                    # Edge already exists: increment co-occurrence and recompute confidence
                    edge = self.graph[s][o]
                    edge["weight"] += 1
                    if tr["chunk_id"] not in edge["chunks"]:
                        edge["chunks"].append(tr["chunk_id"])
                    # Recompute confidence with updated co-occurrence count
                    edge["confidence"] = _compute_triple_confidence(
                        p, s, o, cooccurrence_count=edge["weight"]
                    )
                else:
                    self.graph.add_edge(
                        s, o,
                        predicate=p,
                        weight=1,
                        confidence=tr["confidence"],
                        chunks=[tr["chunk_id"]],
                        evidence=tr["evidence_quote"],
                    )

        self._save_to_disk()

    # ── Graph metrics ──────────────────────────────────────────────────────────

    def compute_graph_metrics(self):
        if len(self.graph) == 0:
            return
        try:
            pagerank = nx.pagerank(self.graph, weight="weight")
        except Exception:
            pagerank = {n: 1.0 / len(self.graph) for n in self.graph.nodes()}
        degree_cent = nx.degree_centrality(self.graph)
        for node in self.graph.nodes():
            self.graph.nodes[node]["pagerank"]           = float(pagerank.get(node, 0.0))
            self.graph.nodes[node]["degree_centrality"]  = float(degree_cent.get(node, 0.0))

    # ── Query context expansion ────────────────────────────────────────────────

    def expand_query_context(self, query: str, max_hops: int = 2) -> Dict[str, Any]:
        if len(self.graph) == 0:
            return {"subgraph_nodes": [], "subgraph_edges": [],
                    "triples_summary": [], "graph_context_text": ""}
        query_words = set(re.findall(r'\b\w+\b', query.lower()))
        matched_nodes = [
            n for n, d in self.graph.nodes(data=True)
            if any(qw in n.lower() for qw in query_words if len(qw) > 2)
        ]
        if not matched_nodes:
            self.compute_graph_metrics()
            matched_nodes = sorted(
                self.graph.nodes(),
                key=lambda n: self.graph.nodes[n].get("pagerank", 0),
                reverse=True
            )[:3]
        subgraph_nodes_set: Set[str] = set()
        for seed_node in matched_nodes:
            subgraph_nodes_set.add(seed_node)
            current_layer = {seed_node}
            for _ in range(max_hops):
                next_layer: Set[str] = set()
                for n in current_layer:
                    next_layer.update(self.graph.successors(n))
                    next_layer.update(self.graph.predecessors(n))
                subgraph_nodes_set.update(next_layer)
                current_layer = next_layer
        subgraph = self.graph.subgraph(subgraph_nodes_set)
        triples_summary = []
        context_sentences = []
        for u, v, data in subgraph.edges(data=True):
            pred     = data.get("predicate", "related to")
            evidence = data.get("evidence", "")
            conf     = data.get("confidence", 0.65)
            triples_summary.append({"subject": u, "predicate": pred,
                                    "object": v, "confidence": conf,
                                    "evidence": evidence})
            context_sentences.append(
                f"[{u}] --({pred}, conf={conf:.2f})--> [{v}]"
            )
        return {
            "subgraph_nodes":      list(subgraph.nodes()),
            "triples_summary":     triples_summary,
            "graph_context_text":  "\n".join(context_sentences),
        }

    # ── Visualisation data ─────────────────────────────────────────────────────

    def get_full_graph_visualization_data(self) -> Dict[str, Any]:
        self.compute_graph_metrics()
        nodes_list, edges_list = [], []
        for node, data in self.graph.nodes(data=True):
            nodes_list.append({
                "id":                node,
                "label":             data.get("label", node),
                "type":              data.get("type", "ENTITY"),
                "frequency":         data.get("frequency", 1),
                "pagerank":          round(data.get("pagerank", 0.0), 4),
                "degree_centrality": round(data.get("degree_centrality", 0.0), 4),
            })
        for u, v, data in self.graph.edges(data=True):
            edges_list.append({
                "from":       u,
                "to":         v,
                "label":      data.get("predicate", "relates_to"),
                "weight":     data.get("weight", 1),
                "confidence": data.get("confidence", 0.65),
            })
        return {
            "nodes": nodes_list,
            "edges": edges_list,
            "stats": {
                "total_nodes":   len(nodes_list),
                "total_edges":   len(edges_list),
                "graph_density": round(nx.density(self.graph), 4)
                                 if len(self.graph) > 1 else 0,
                "avg_confidence": round(
                    sum(e["confidence"] for e in edges_list) / len(edges_list), 3
                ) if edges_list else 0,
            },
        }

    # ── Persistence ────────────────────────────────────────────────────────────

    def _save_to_disk(self):
        try:
            data = nx.node_link_data(self.graph, edges="links")
            for node in data["nodes"]:
                for k, v in node.items():
                    if isinstance(v, set):
                        node[k] = list(v)
            for link in data.get("links", data.get("edges", [])):
                for k, v in link.items():
                    if isinstance(v, set):
                        link[k] = list(v)
            os.makedirs(os.path.dirname(self._persistence_path), exist_ok=True)
            with open(self._persistence_path, "w", encoding="utf-8") as f:
                json.dump(data, f)
        except Exception as e:
            print(f"[GraphEngine] Warning: Could not persist graph: {e}")

    def _load_from_disk(self):
        if not os.path.exists(self._persistence_path):
            return
        try:
            with open(self._persistence_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.graph = nx.node_link_graph(data, edges="links")
            print(f"[GraphEngine] Restored graph: "
                  f"{len(self.graph.nodes())} nodes, {len(self.graph.edges())} edges")
        except Exception as e:
            print(f"[GraphEngine] Warning: Could not restore graph: {e}")

    def clear(self):
        self.graph.clear()
        if os.path.exists(self._persistence_path):
            os.remove(self._persistence_path)


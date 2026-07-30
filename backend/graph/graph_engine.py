import re
import networkx as nx
from typing import List, Dict, Any, Tuple, Set

class GraphEngineeringEngine:
    def __init__(self):
        self.graph = nx.DiGraph()
        self.entity_types = {
            "ORGANIZATION": ["corp", "inc", "company", "bank", "foundation", "group", "ltd", "agency", "tech", "ai", "team", "department"],
            "TECHNOLOGY": ["python", "react", "fastapi", "graph", "vector", "database", "api", "model", "algorithm", "blockchain", "ocr", "tika", "elasticsearch", "llm", "neural", "gpu", "cpu", "server"],
            "CONCEPT": ["security", "auth", "revenue", "growth", "pipeline", "ingestion", "traversal", "verification", "hallucination", "performance", "latency", "accuracy", "compliance", "encryption"],
            "METRIC": ["percent", "%", "dollar", "$", "ms", "gb", "mb", "tb", "score", "index", "trust score", "rate"],
            "LOCATION": ["us", "eu", "asia", "global", "datacenter", "cloud", "region", "new york", "london", "tokyo", "san francisco"]
        }
        
    def extract_entities_and_triples(self, chunk: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        text = chunk["content"]
        chunk_id = chunk["chunk_id"]
        doc_id = chunk["document_id"]
        filename = chunk["filename"]

        entities = []
        triples = []
        
        cap_words = re.findall(r'\b[A-Z][a-zA-Z0-9_\-\.]{2,}\b', text)
        numeric_metrics = re.findall(r'\b\d+(?:\.\d+)?%|\$\d+(?:\.\d+)?|\b\d+ (?:ms|GB|MB|seconds|users|nodes)\b', text)
        
        detected_entities: Dict[str, str] = {}

        for word in cap_words:
            w_lower = word.lower()
            e_type = "CONCEPT"
            for t_type, keywords in self.entity_types.items():
                if any(kw in w_lower for kw in keywords):
                    e_type = t_type
                    break
            detected_entities[word] = e_type

        for metric in numeric_metrics:
            detected_entities[metric] = "METRIC"

        words = re.findall(r'\b[a-zA-Z]{4,}\b', text)
        for w in words:
            w_lower = w.lower()
            for t_type, keywords in self.entity_types.items():
                if w_lower in keywords:
                    detected_entities[w.capitalize()] = t_type

        sentences = re.split(r'(?<=[.!?])\s+', text)
        predicate_patterns = [
            r'(\b[A-Z][a-zA-Z0-9_]+(?:\s+[A-Z][a-zA-Z0-9_]+)*)\s+(uses|utilizes|implements|supports|connects to|extracts|verifies|stores|processes|generates|provides|reduces|increases|runs on|integrates with|contains)\s+(\b[A-Z][a-zA-Z0-9_]+|\b\d+[\w%]+|\b[a-zA-Z0-9_\s]{3,25}\b)',
            r'(\b[a-zA-Z0-9_]{3,20}\b)\s+(is a|acts as|belongs to|has|triggers|enables|powers|audits)\s+(\b[a-zA-Z0-9_\s]{3,25}\b)'
        ]

        for sentence in sentences:
            for pattern in predicate_patterns:
                matches = re.findall(pattern, sentence, re.IGNORECASE)
                for subj, pred, obj in matches:
                    subj_clean = subj.strip().title()
                    obj_clean = obj.strip().title()
                    pred_clean = pred.strip().lower()

                    if len(subj_clean) > 2 and len(obj_clean) > 2 and subj_clean != obj_clean:
                        detected_entities[subj_clean] = detected_entities.get(subj_clean, "ENTITY")
                        detected_entities[obj_clean] = detected_entities.get(obj_clean, "ENTITY")

                        triples.append({
                            "subject": subj_clean,
                            "predicate": pred_clean,
                            "object": obj_clean,
                            "confidence": 0.88,
                            "chunk_id": chunk_id,
                            "document_id": doc_id,
                            "evidence_quote": sentence[:120]
                        })

        for name, ent_type in detected_entities.items():
            entities.append({
                "name": name,
                "type": ent_type,
                "chunk_id": chunk_id,
                "document_id": doc_id,
                "filename": filename
            })

        return entities, triples

    def add_chunk_data(self, chunks: List[Dict[str, Any]]):
        for chunk in chunks:
            entities, triples = self.extract_entities_and_triples(chunk)
            
            for ent in entities:
                node_id = ent["name"]
                if not self.graph.has_node(node_id):
                    self.graph.add_node(
                        node_id,
                        label=node_id,
                        type=ent["type"],
                        frequency=1,
                        documents={ent["document_id"]},
                        chunks={ent["chunk_id"]}
                    )
                else:
                    node_data = self.graph.nodes[node_id]
                    node_data["frequency"] += 1
                    node_data["documents"].add(ent["document_id"])
                    node_data["chunks"].add(ent["chunk_id"])

            for tr in triples:
                s, p, o = tr["subject"], tr["predicate"], tr["object"]
                if not self.graph.has_node(s):
                    self.graph.add_node(s, label=s, type="ENTITY", frequency=1, documents={tr["document_id"]}, chunks={tr["chunk_id"]})
                if not self.graph.has_node(o):
                    self.graph.add_node(o, label=o, type="ENTITY", frequency=1, documents={tr["document_id"]}, chunks={tr["chunk_id"]})

                if self.graph.has_edge(s, o):
                    self.graph[s][o]["weight"] += 1
                    self.graph[s][o]["chunks"].add(tr["chunk_id"])
                else:
                    self.graph.add_edge(
                        s, o,
                        predicate=p,
                        weight=1,
                        confidence=tr["confidence"],
                        chunks={tr["chunk_id"]},
                        evidence=tr["evidence_quote"]
                    )

    def compute_graph_metrics(self):
        if len(self.graph) == 0:
            return

        try:
            pagerank = nx.pagerank(self.graph, weight="weight")
        except Exception:
            pagerank = {node: 1.0 / len(self.graph) for node in self.graph.nodes()}

        degree_cent = nx.degree_centrality(self.graph)

        for node in self.graph.nodes():
            self.graph.nodes[node]["pagerank"] = float(pagerank.get(node, 0.0))
            self.graph.nodes[node]["degree_centrality"] = float(degree_cent.get(node, 0.0))

    def expand_query_context(self, query: str, max_hops: int = 2) -> Dict[str, Any]:
        if len(self.graph) == 0:
            return {"subgraph_nodes": [], "subgraph_edges": [], "triples_summary": [], "graph_context_text": ""}

        query_words = set(re.findall(r'\b\w+\b', query.lower()))
        matched_nodes = []
        
        for node, data in self.graph.nodes(data=True):
            node_lower = node.lower()
            if any(qw in node_lower for qw in query_words if len(qw) > 2):
                matched_nodes.append(node)

        if not matched_nodes:
            self.compute_graph_metrics()
            matched_nodes = sorted(self.graph.nodes(), key=lambda n: self.graph.nodes[n].get("pagerank", 0), reverse=True)[:3]

        subgraph_nodes_set: Set[str] = set()
        for seed_node in matched_nodes:
            subgraph_nodes_set.add(seed_node)
            current_layer = {seed_node}
            for _ in range(max_hops):
                next_layer = set()
                for n in current_layer:
                    next_layer.update(self.graph.successors(n))
                    next_layer.update(self.graph.predecessors(n))
                subgraph_nodes_set.update(next_layer)
                current_layer = next_layer

        subgraph = self.graph.subgraph(subgraph_nodes_set)

        triples_summary = []
        context_sentences = []

        for u, v, data in subgraph.edges(data=True):
            pred = data.get("predicate", "related to")
            evidence = data.get("evidence", "")
            triples_summary.append({
                "subject": u,
                "predicate": pred,
                "object": v,
                "evidence": evidence
            })
            context_sentences.append(f"[{u}] --({pred})--> [{v}]")

        return {
            "subgraph_nodes": list(subgraph.nodes()),
            "triples_summary": triples_summary,
            "graph_context_text": "\n".join(context_sentences)
        }

    def get_full_graph_visualization_data(self) -> Dict[str, Any]:
        self.compute_graph_metrics()
        
        nodes_list = []
        edges_list = []

        for node, data in self.graph.nodes(data=True):
            nodes_list.append({
                "id": node,
                "label": data.get("label", node),
                "type": data.get("type", "ENTITY"),
                "frequency": data.get("frequency", 1),
                "pagerank": round(data.get("pagerank", 0.0), 4),
                "degree_centrality": round(data.get("degree_centrality", 0.0), 4)
            })

        for u, v, data in self.graph.edges(data=True):
            edges_list.append({
                "from": u,
                "to": v,
                "label": data.get("predicate", "relates_to"),
                "weight": data.get("weight", 1),
                "confidence": data.get("confidence", 0.8)
            })

        return {
            "nodes": nodes_list,
            "edges": edges_list,
            "stats": {
                "total_nodes": len(nodes_list),
                "total_edges": len(edges_list),
                "graph_density": round(nx.density(self.graph), 4) if len(self.graph) > 1 else 0
            }
        }

    def clear(self):
        self.graph.clear()

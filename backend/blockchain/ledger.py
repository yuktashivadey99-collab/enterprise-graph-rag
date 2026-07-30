import hashlib
import json
import datetime
from typing import List, Dict, Any

class Block:
    def __init__(self, index: int, timestamp: str, data: List[Dict[str, Any]], previous_hash: str):
        self.index = index
        self.timestamp = timestamp
        self.data = data
        self.previous_hash = previous_hash
        self.merkle_root = self.calculate_merkle_root(data)
        self.nonce = 0
        self.hash = self.calculate_hash()

    def calculate_merkle_root(self, transactions: List[Dict[str, Any]]) -> str:
        if not transactions:
            return hashlib.sha256(b"EMPTY_BLOCK").hexdigest()
        
        hashes = [hashlib.sha256(json.dumps(t, sort_keys=True).encode()).hexdigest() for t in transactions]
        
        while len(hashes) > 1:
            if len(hashes) % 2 != 0:
                hashes.append(hashes[-1])
            new_hashes = []
            for i in range(0, len(hashes), 2):
                combined = hashes[i] + hashes[i+1]
                new_hashes.append(hashlib.sha256(combined.encode()).hexdigest())
            hashes = new_hashes
            
        return hashes[0]

    def calculate_hash(self) -> str:
        raw_data = f"{self.index}{self.timestamp}{self.previous_hash}{self.merkle_root}{self.nonce}"
        return hashlib.sha256(raw_data.encode()).hexdigest()


class BlockchainAuditLedger:
    def __init__(self):
        self.chain: List[Block] = []
        self.pending_transactions: List[Dict[str, Any]] = []
        self._create_genesis_block()

    def _create_genesis_block(self):
        genesis_block = Block(
            index=0,
            timestamp=datetime.datetime.utcnow().isoformat(),
            data=[{"type": "GENESIS", "message": "Enterprise Graph-RAG Blockchain Audit Ledger Initialized"}],
            previous_hash="0" * 64
        )
        self.chain.append(genesis_block)

    def get_latest_block(self) -> Block:
        return self.chain[-1]

    def record_audit_event(self, event_type: str, details: Dict[str, Any]) -> str:
        tx = {
            "tx_id": hashlib.sha256(f"{datetime.datetime.utcnow().isoformat()}_{event_type}".encode()).hexdigest()[:16],
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "event_type": event_type,
            "details": details
        }
        self.pending_transactions.append(tx)
        block_hash = self.mine_pending_transactions()
        return block_hash

    def mine_pending_transactions(self) -> str:
        if not self.pending_transactions:
            return self.get_latest_block().hash

        latest_block = self.get_latest_block()
        new_block = Block(
            index=len(self.chain),
            timestamp=datetime.datetime.utcnow().isoformat(),
            data=self.pending_transactions.copy(),
            previous_hash=latest_block.hash
        )
        
        while not new_block.hash.startswith("0"):
            new_block.nonce += 1
            new_block.hash = new_block.calculate_hash()

        self.chain.append(new_block)
        self.pending_transactions.clear()
        return new_block.hash

    def verify_chain_integrity(self) -> Dict[str, Any]:
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            previous = self.chain[i-1]

            if current.hash != current.calculate_hash():
                return {"valid": False, "reason": f"Block #{current.index} hash mismatch!", "block_index": current.index}

            if current.previous_hash != previous.hash:
                return {"valid": False, "reason": f"Block #{current.index} previous_hash link broken!", "block_index": current.index}

            if current.merkle_root != current.calculate_merkle_root(current.data):
                return {"valid": False, "reason": f"Block #{current.index} Merkle root tampered!", "block_index": current.index}

        return {
            "valid": True,
            "chain_length": len(self.chain),
            "latest_block_hash": self.get_latest_block().hash,
            "merkle_root": self.get_latest_block().merkle_root
        }

    def get_blocks(self) -> List[Dict[str, Any]]:
        result = []
        for block in self.chain:
            result.append({
                "index": block.index,
                "timestamp": block.timestamp,
                "previous_hash": block.previous_hash,
                "merkle_root": block.merkle_root,
                "hash": block.hash,
                "nonce": block.nonce,
                "transaction_count": len(block.data),
                "data": block.data
            })
        return result

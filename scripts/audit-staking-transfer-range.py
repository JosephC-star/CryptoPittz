"""Reconcile captured collection transfer pages against parent transaction logs."""

import argparse
import base64
import json
from datetime import datetime
from pathlib import Path

COLLECTIONS = ("PITTZ-1a4c2d", "PITTZVICE-c3ec94")
TRANSFER_EVENTS = {"ESDTNFTTransfer", "MultiESDTNFTTransfer"}


def read_json(path):
    return json.loads(path.read_text())


def indexed_parents(directory, collection, start, cutoff):
    count = read_json(directory / f"{collection}-transfers-count.json")
    rows = read_json(directory / f"{collection}-transfers.json")
    hashes = {row["txHash"] for row in rows}
    if len(rows) != count or len(hashes) != count:
        raise ValueError(f"{collection}: transfer count or duplicate rows do not reconcile")
    if any(not start <= row["timestamp"] <= cutoff for row in rows):
        raise ValueError(f"{collection}: transfer row outside the replay window")
    return count, {row.get("originalTxHash") or row["txHash"] for row in rows}


def touched_nonces(transaction, collection, start, cutoff):
    nonces = set()
    for record in [transaction, *transaction.get("results", [])]:
        if not start <= record.get("timestamp", transaction["timestamp"]) <= cutoff:
            continue
        for log in (record.get("logs") or {}).get("events", []):
            if log["identifier"] not in TRANSFER_EVENTS:
                continue
            topics = [base64.b64decode(topic or "", validate=True) for topic in log.get("topics") or []]
            if len(topics) < 4 or (len(topics) - 1) % 3 or len(topics[-1]) != 32:
                continue
            for i in range(0, len(topics) - 1, 3):
                if topics[i] == collection.encode() and int.from_bytes(topics[i + 2], "big") == 1:
                    nonces.add(int.from_bytes(topics[i + 1], "big"))
    return nonces


def audit(directory, collection, start, cutoff):
    count, parents = indexed_parents(directory, collection, start, cutoff)
    touched = set()
    unresolved = []
    for parent in sorted(parents):
        try:
            transaction = read_json(directory / f"{parent}.tx")
        except (FileNotFoundError, json.JSONDecodeError):
            unresolved.append(parent)
            continue
        if transaction.get("txHash") != parent:
            raise ValueError(f"Unexpected transaction hash for {parent}")
        nonces = touched_nonces(transaction, collection, start, cutoff)
        if not nonces:
            unresolved.append(parent)
        touched.update(nonces)
    return {
        "indexedRows": count,
        "parentTransactions": len(parents),
        "touchedNoncesHex": [format(nonce, "x") for nonce in sorted(touched)],
        "unresolvedParents": unresolved,
    }


def utc_timestamp(value):
    date = datetime.fromisoformat(value)
    if date.utcoffset() is None:
        raise argparse.ArgumentTypeError("timestamp must include a timezone")
    return date.timestamp()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    parser.add_argument("start", type=utc_timestamp)
    parser.add_argument("cutoff", type=utc_timestamp)
    args = parser.parse_args()
    if args.start > args.cutoff:
        parser.error("start must precede the cutoff")
    print(json.dumps({
        collection: audit(args.directory, collection, args.start, args.cutoff)
        for collection in COLLECTIONS
    }, indent=2))

"""Inspect confirmed listing events in captured MultiversX transaction JSON.

This is an evidence reader for known events, not a complete historical index.
"""

import argparse
import base64
import json
from datetime import datetime, timezone
from pathlib import Path


VENUES = {
    "erd1qqqqqqqqqqqqqpgqwp73w2a9eyzs64eltupuz3y3hv798vlv899qrjnflg": "OOX",
    "erd1qqqqqqqqqqqqqpgq6wegs2xkypfpync8mn2sa5cmpqjlvrhwz5nqgepyg8": "XOXNO",
}
EVENTS = {
    ("OOX", "auctionToken"): (b"auction_token_event", "opened"),
    ("OOX", "buy"): (b"buy_event", "closed"),
    ("XOXNO", "listing"): (b"auction_token_event", "opened"),
    ("XOXNO", "withdraw"): (b"withdraw_event", "closed"),
    ("XOXNO", "returnListing"): (b"withdraw_event", "closed"),
    ("XOXNO", "endAuction"): (b"end_auction_event", "closed"),
}


def listing_events(transactions, identifier, cutoff):
    collection, nonce_hex = identifier.rsplit("-", 1)
    nonce = int(nonce_hex, 16)
    seen = set()
    events = []
    for transaction in transactions:
        if transaction.get("status") != "success":
            continue
        for record in [transaction, *transaction.get("results", [])]:
            timestamp = record.get("timestamp", transaction["timestamp"])
            if timestamp > cutoff:
                continue
            for log in (record.get("logs") or {}).get("events", []):
                venue = VENUES.get(log["address"])
                event_type = EVENTS.get((venue, log["identifier"]))
                if event_type is None or len(log.get("topics") or []) < 4:
                    continue
                marker, token, serial, auction = (
                    base64.b64decode(topic or "", validate=True) for topic in log["topics"][:4]
                )
                expected_marker, kind = event_type
                if marker != expected_marker or token != collection.encode() or int.from_bytes(serial, "big") != nonce:
                    continue
                key = (venue, int.from_bytes(auction, "big"), kind, transaction["txHash"])
                if key in seen:
                    continue
                seen.add(key)
                events.append(dict(venue=venue, auction=key[1], kind=kind, timestamp=timestamp, txHash=key[3]))
    return sorted(events, key=lambda event: event["timestamp"])


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("identifier")
    parser.add_argument("cutoff", type=datetime.fromisoformat, help="ISO timestamp with timezone")
    parser.add_argument("transactions", nargs="+", type=Path)
    args = parser.parse_args()
    if args.cutoff.utcoffset() is None:
        parser.error("cutoff must include a timezone")
    transactions = [json.loads(path.read_text()) for path in args.transactions]
    for event in listing_events(transactions, args.identifier, args.cutoff.timestamp()):
        event["utc"] = datetime.fromtimestamp(event["timestamp"], timezone.utc).isoformat()
        print(json.dumps(event))

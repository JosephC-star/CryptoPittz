"""Compare public MultiversX ranks and embedded project ranks without allocating rewards."""

import base64
import json
import re
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from urllib.request import urlopen


COLLECTIONS = {
    "PITTZ-1a4c2d": (5310, (1, 2, 3, 451, 1245, 3195, 6969)),
    "PITTZVICE-c3ec94": (1395, (1, 2, 3, 104, 298, 701, 1387)),
}
PAGE_SIZE = 500


def read_page(collection, offset):
    url = (
        f"https://api.multiversx.com/collections/{collection}/nfts"
        f"?from={offset}&size={PAGE_SIZE}&fields=identifier,rank,attributes"
    )
    with urlopen(url, timeout=30) as response:
        return json.load(response)


def project_rank(attributes):
    metadata = base64.b64decode(attributes, validate=True).decode()
    tags = re.search(r"(?:^|;)tags:([^;]*)", metadata)
    ranks = re.findall(r"(?:^|,)\s*Rank-(\d+)\s*(?=,|$)", tags[1]) if tags else []
    return int(ranks[0]) if len(ranks) == 1 else None


def summarize(ranks, limits):
    counts = Counter(ranks)
    return {
        "tiers": [
            sum(count for rank, count in counts.items() if rank is not None and low < rank <= high)
            for low, high in zip((0, *limits), limits)
        ],
        "missingOrOutsideTiers": sum(
            count for rank, count in counts.items() if rank is None or not 1 <= rank <= limits[-1]
        ),
    }


def audit(collection, expected, limits, pool):
    offsets = range(0, expected + PAGE_SIZE, PAGE_SIZE)
    rows = [row for page in pool.map(lambda offset: read_page(collection, offset), offsets) for row in page]
    identifiers = {row["identifier"] for row in rows}
    if len(rows) != expected or len(identifiers) != expected:
        raise ValueError(f"{collection}: expected {expected} distinct NFTs, got {len(rows)} rows and {len(identifiers)} IDs")
    embedded = [project_rank(row.get("attributes") or "") for row in rows]
    return {
        "nfts": len(rows),
        "apiRank": summarize((row.get("rank") for row in rows), limits),
        "projectRank": summarize(embedded, limits),
        "differentRanks": sum(row.get("rank") != rank for row, rank in zip(rows, embedded)),
    }


if __name__ == "__main__":
    with ThreadPoolExecutor(max_workers=4) as pool:
        print(json.dumps({
            collection: audit(collection, expected, limits, pool)
            for collection, (expected, limits) in COLLECTIONS.items()
        }, indent=2))

from __future__ import annotations

import os
import sys
from pathlib import Path

from pgvector.psycopg2 import register_vector
from psycopg2 import connect
from sentence_transformers import SentenceTransformer

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.config import settings  # noqa: E402


def main() -> int:
    database_url = os.getenv("SYNC_DATABASE_URL", settings.SYNC_DATABASE_URL)
    model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

    with connect(database_url) as conn:
        register_vector(conn)
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, example_text
                FROM chatbot_intent_examples
                WHERE is_active = TRUE
                ORDER BY id
                """
            )
            rows = cur.fetchall()
            if not rows:
                print("No active intent examples found.")
                return 0

            for example_id, example_text in rows:
                embedding = model.encode(example_text, normalize_embeddings=True).tolist()
                cur.execute(
                    "UPDATE chatbot_intent_examples SET embedding = %s WHERE id = %s",
                    (embedding, example_id),
                )

        conn.commit()

    print(f"Updated embeddings for {len(rows)} intent examples.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

import asyncio
from app.pipeline import run
from app.retrieval.vector_store import get_connection, purge_retracted, expire_stale, enforce_row_cap, TTL_DAYS, MAX_ROWS

MAINTENANCE_INTERVAL_HOURS = 24


def run_maintenance() -> None:

    conn = get_connection()
    try:
        retracted = purge_retracted(conn)
        expired = expire_stale(conn, ttl_days=TTL_DAYS)
        evicted = enforce_row_cap(conn, max_rows=MAX_ROWS)
        if retracted or expired or evicted:
            print(f"[maintenance] purged={retracted} expired={expired} evicted={evicted}")
    finally:
        conn.close()


async def maintenance_loop() -> None:
    while True:
        await asyncio.sleep(MAINTENANCE_INTERVAL_HOURS * 3600)
        run_maintenance()


async def main() -> None:
    run_maintenance()
    
    asyncio.create_task(maintenance_loop())

    while True:
        user_input = input("You: ").strip()

        if user_input.lower() in ("/quit", "/exit"):
            break
        if not user_input:
            continue

        if user_input.lower() == "/reset":
            print("Session Reset.\n")
            continue

        print("Researcher: ", end="", flush=True)

        final_answer: str = await run(user_input)

        print(final_answer)
        print("\n")


if __name__ == "__main__":
    asyncio.run(main())
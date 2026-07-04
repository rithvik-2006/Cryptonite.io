# Cryptonite Phase 2 — The Brain (Quant Intelligence Engine)

This is the intelligence layer of Cryptonite. It continuously transforms raw market data into explainable investment recommendations.

## Pipeline Architecture
The system employs an async worker pipeline:
`Redis Feature Store -> Market Loader -> Feature Engineering -> Forecasting -> Decision Engine -> Risk Engine -> Explainability Engine -> Ranking Engine -> Recommendation Publisher -> Redis`

## Stack
- Python 3.11+
- Polars (Feature Engineering)
- Pydantic V2 (Strict typing for pipeline states)
- FastAPI (Debug endpoints)
- Redis-py (Async queue & data fetching)

## Run Locally
1. Start a local redis instance.
2. `pip install -r requirements.txt`
3. `python main.py`

## Endpoints
- `GET /health`
- `POST /trigger/{token}` - Seeds the pipeline with a given token name
- `GET /recommendations/{token}` - Fetches the output signal

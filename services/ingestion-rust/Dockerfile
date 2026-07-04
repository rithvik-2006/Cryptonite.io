# Builder stage
FROM rust:1.90-slim as builder

WORKDIR /usr/src/cryptonite-ingestion
COPY . .

# Build dependencies and binary
RUN cargo build --release

# Runner stage
FROM rust:1.90-slim

WORKDIR /app
COPY --from=builder /usr/src/cryptonite-ingestion/target/release/ingestion-rust /app/ingestion-service

CMD ["/app/ingestion-service"]

# Multi-Stage Build for OperonRust CLI Daemon
FROM rust:alpine AS builder

RUN apk add --no-cache \
    musl-dev \
    pkgconfig \
    openssl-dev \
    ca-certificates \
    perl \
    make \
    cmake \
    git \
    curl \
    && update-ca-certificates

WORKDIR /usr/src/operon

# Copy entire Cargo workspace
COPY Cargo.toml ./Cargo.toml
COPY crates ./crates

WORKDIR /usr/src/operon

# Use git sparse registry to bypass index.crates.io config.json SSL verification error on corporate proxy
RUN mkdir -p /root/.cargo && \
    echo '[http]' > /root/.cargo/config.toml && \
    echo 'check-revoke = false' >> /root/.cargo/config.toml && \
    echo '[registries.crates-io]' >> /root/.cargo/config.toml && \
    echo 'protocol = "sparse"' >> /root/.cargo/config.toml && \
    echo '[net]' >> /root/.cargo/config.toml && \
    echo 'git-fetch-with-cli = true' >> /root/.cargo/config.toml

ENV CARGO_HTTP_CHECK_REVOKE=false
ENV CARGO_NET_GIT_FETCH_WITH_CLI=true
ENV SWAGGER_UI_DOWNLOAD_URL="file:///usr/src/operon/crates/cli/deploy/v5.17.14.zip"

RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/src/operon/target \
    cargo build --release --bin opn \
    && cp /usr/src/operon/target/release/opn /usr/local/bin/opn

# Production Minimal Runtime Stage
FROM alpine:3.20 AS runtime

RUN apk add --no-cache \
    ca-certificates \
    libssl3 \
    curl \
    tzdata

# Create dedicated non-root user
RUN adduser -D -u 1000 operon \
    && mkdir -p /home/operon/.operon \
    && chown -R operon:operon /home/operon

COPY --from=builder /usr/local/bin/opn /usr/local/bin/opn

USER operon
WORKDIR /home/operon

# Canonical Platform Environment Variables (Techstack Naming SSOT)
ENV DATA_DIR="/home/operon/.operon"
ENV DAEMON_HOST="0.0.0.0"
ENV DAEMON_PORT="8765"

EXPOSE 8765

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://127.0.0.1:8765/api/v1/health || exit 1

ENTRYPOINT ["opn"]
CMD ["worker", "start", "-H", "0.0.0.0", "-p", "8765"]

# The container an eval agent runs in: it sees only the fixture mounted at /work.
FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates git ripgrep \
    && rm -rf /var/lib/apt/lists/*

ARG CLAUDE_VERSION
RUN test -n "$CLAUDE_VERSION" && npm install -g "@anthropic-ai/claude-code@${CLAUDE_VERSION}"

WORKDIR /work

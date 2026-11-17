# syntax=docker/dockerfile:1
#
# Embeds template (debrain-ai-embeds-template): Lit bundle + Express demo/CDN.
# Built on debrainpacks: https://github.com/debrain-dev/debrainpacks

ARG DEBRAINPACKS=ghcr.io/debrain-dev/debrainpacks
ARG NODE_VERSION=26

# ── Build ──────────────────────────────────────────────────────────────────────
FROM ${DEBRAINPACKS}:${NODE_VERSION}-builder AS build

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm fetch

COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --offline --frozen-lockfile

# Typecheck, bundle into dist/embed/, demo pages into dist/
RUN pnpm build

# Keep only runtime dependencies (express, helmet, tsx)
RUN pnpm prune --prod && debrainpacks-prune node_modules

# ── Runtime ────────────────────────────────────────────────────────────────────
FROM ${DEBRAINPACKS}:${NODE_VERSION}-runtime

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/domains.config.json ./domains.config.json
COPY --from=build /app/server ./server
COPY --from=build /app/dist ./dist

ENV PORT=3000 \
    HEALTHCHECK_PATH=/embed/embed.es.js
EXPOSE 3000

CMD ["node", "--import", "tsx", "server/index.ts"]

#!/bin/sh
# Runs once when the devcontainer is created (VS Code postCreateCommand / .devcontainer/up)
set -eu
# CI=true: install without a TTY, replacing a node_modules installed on the host
CI=true pnpm install
touch "$HOME/.debrainpacks-post-create"

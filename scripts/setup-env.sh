#!/bin/sh
# Local env setup: one root .env shared by the API (via dotenv-cli) and the web app (via a symlink).
set -eu
cd "$(dirname "$0")/.."

if [ -e .env ]; then
  echo ".env already exists: left unchanged"
else
  cp .env.example .env
  echo "Created .env from .env.example: fill in the values"
fi

if [ -e apps/web/.env.local ] || [ -L apps/web/.env.local ]; then
  echo "apps/web/.env.local already exists: left unchanged"
else
  ln -s ../../.env apps/web/.env.local
  echo "Linked apps/web/.env.local -> ../../.env"
fi

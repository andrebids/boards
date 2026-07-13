#!/usr/bin/env bash

# Creates a portable backup of Planka data without relying on fixed container names.
# Optional environment variables:
#   COMPOSE_FILE=docker-compose.yml
#   COMPOSE_PROJECT_NAME=planka
#   BACKUP_DIR=/secure/path/backups
#   POSTGRES_USER=postgres
set -Eeuo pipefail

umask 077

backup_dir="${BACKUP_DIR:-$PWD/backups}"
postgres_user="${POSTGRES_USER:-postgres}"
timestamp="$(date --utc +%Y-%m-%dT%H-%M-%SZ)"
archive="$backup_dir/planka-$timestamp.tar.gz"
work_dir="$(mktemp -d)"

compose=(docker compose)

if [[ -n "${COMPOSE_FILE:-}" ]]; then
  compose+=(--file "$COMPOSE_FILE")
fi

if [[ -n "${COMPOSE_PROJECT_NAME:-}" ]]; then
  compose+=(--project-name "$COMPOSE_PROJECT_NAME")
fi

cleanup() {
  rm -rf "$work_dir"
}

trap cleanup EXIT

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker não está disponível." >&2
  exit 1
fi

mkdir -p "$backup_dir"

postgres_container="$("${compose[@]}" ps -q postgres)"
planka_container="$("${compose[@]}" ps -q planka)"

if [[ -z "$postgres_container" || -z "$planka_container" ]]; then
  echo "Os serviços 'postgres' e 'planka' têm de estar em execução para criar o backup." >&2
  exit 1
fi

echo "A exportar a base de dados..."
"${compose[@]}" exec -T postgres pg_dumpall --clean --if-exists -U "$postgres_user" >"$work_dir/postgres.sql"

echo "A exportar anexos e imagens..."
docker run --rm \
  --volumes-from "$planka_container" \
  --volume "$work_dir:/backup" \
  alpine:3.21 \
  tar -C /app -czf /backup/media.tar.gz \
  public/favicons \
  public/user-avatars \
  public/background-images \
  private/attachments

echo "A criar arquivo: $archive"
tar -C "$work_dir" -czf "$archive" postgres.sql media.tar.gz
sha256sum "$archive" >"$archive.sha256"

echo "Backup concluído."
echo "Arquivo: $archive"
echo "Checksum: $archive.sha256"

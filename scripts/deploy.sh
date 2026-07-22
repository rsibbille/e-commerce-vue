#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STACK_NAME="${STACK_NAME:-e-commerce}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

info() { printf '[INFO] %s\n' "$*"; }
error() { printf '[ERROR] %s\n' "$*" >&2; }

if ! command -v docker >/dev/null 2>&1; then
  error "Docker est requis pour deployer la stack."
  exit 1
fi

cd "${ROOT_DIR}"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

: "${CI_REGISTRY_IMAGE:?CI_REGISTRY_IMAGE doit pointer vers le GitLab Container Registry}"
: "${IMAGE_TAG:?IMAGE_TAG doit correspondre au tag image a deployer}"
case "${COMPOSE_FILE}" in
  docker-compose.staging.yml)
    SWARM_SECRET_NAME="${SWARM_SECRET_NAME:-ecommerce_staging_jwt_secret}"
    ;;
  docker-compose.prod.yml)
    SWARM_SECRET_NAME="${SWARM_SECRET_NAME:-ecommerce_production_jwt_secret}"
    ;;
  *)
    SWARM_SECRET_NAME="${SWARM_SECRET_NAME:-}"
    ;;
esac

if [ -n "${SWARM_SECRET_NAME}" ]; then
  if ! docker secret inspect "${SWARM_SECRET_NAME}" >/dev/null 2>&1; then
    error "Secret Swarm absent: ${SWARM_SECRET_NAME}"
    exit 1
  fi
fi

info "Deploiement Docker Swarm de ${STACK_NAME} avec ${COMPOSE_FILE}"
docker stack deploy -c "${COMPOSE_FILE}" "${STACK_NAME}" --with-registry-auth
docker stack services "${STACK_NAME}" || true

#!/usr/bin/env bash
# Configuracion comun de los scripts de la Practica 8. Ajuste aqui, no en cada script.
# Ubicacion esperada: <repo-de-practicas>/P8/scripts/

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

export CLUSTER_NAME="${CLUSTER_NAME:-sa-p6-cluster}"
export AWS_REGION="${AWS_REGION:-us-east-2}"
export AWS_DEFAULT_REGION="$AWS_REGION"

CLUSTER_YAML="$ROOT/P6/aws/cluster-us-east-2.yaml"
STORAGECLASS_YAML="$ROOT/P6/aws/storageclass-gp3.yaml"
TF_DIR="$ROOT/P8/terraform"

NS="${NS:-sa-p8}"                    # namespace (lo crea Terraform)
APP="${APP:-sa-platform-p8}"         # Application de ArgoCD
GITOPS_URL="${GITOPS_URL:-https://github.com/Afedo23/software-avanzado-gitops}"
GITOPS_DIR="${GITOPS_DIR:-$ROOT/../software-avanzado-gitops}"   # clon local del repo GitOps
CARNET="${CARNET:-202003948}"

log() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
ok()  { printf '  \033[0;32m[OK]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

# --- Versiones fijas (no usar "latest") ---
# Kyverno v1.19 es la ultima version con ClusterPolicy; v1.20 la elimina (migrar a ValidatingPolicy).
KYVERNO_VERSION="${KYVERNO_VERSION:-v1.19.1}"
SEALED_VERSION="${SEALED_VERSION:-v0.40.0}"
# Respaldo de la llave de Sealed Secrets: FUERA del repo, NUNCA a Git.
KEY_BACKUP="${KEY_BACKUP:-$HOME/.p8/sealed-secrets-key.json}"
EXTRAS="$ROOT/P8/scripts/gitops-extras"

#!/usr/bin/env bash
# Deja EVIDENCIA en el cluster: canary exitoso + rollback automatico, todo via Git.
# Uso:  ./05_demo_rollback.sh <tag-bueno> <tag-malo>      ej: ./05_demo_rollback.sh 1.0.3 1.0.4
# Requiere: ambas imagenes ya publicadas en GHCR y el repo GitOps clonado en $GITOPS_DIR.
# La imagen mala debe arrancar (readiness OK) y devolver != 200 en /health al Job de analisis.
set -uo pipefail
source "$(dirname "$0")/config.sh"

GOOD="${1:?Falta tag bueno}"; BAD="${2:?Falta tag malo}"
[ -d "$GITOPS_DIR/.git" ] || die "No encuentro el clon del repo GitOps en $GITOPS_DIR"
KFILE="manifests/kustomization.yaml"

set_tag() {   # $1 = tag ; commit + push + refresh de ArgoCD
  ( cd "$GITOPS_DIR" \
    && sed -i -E "s|newTag: *[^[:space:]]+|newTag: $1|" "$KFILE" \
    && git add "$KFILE" \
    && { git diff --cached --quiet || git commit -q -m "chore: api-gateway $1"; } \
    && git pull -q --rebase origin main \
    && git push -q origin main ) || die "Fallo git al fijar $1"
  kubectl annotate application "$APP" -n argocd argocd.argoproj.io/refresh=hard --overwrite >/dev/null
}

log "1/3 Canary exitoso: $GOOD"
set_tag "$GOOD"
kubectl argo rollouts status api-gateway -n "$NS" --timeout 900s && ok "Rollout $GOOD promovido al 100%"

log "2/3 Version defectuosa: $BAD (se espera abort + rollback)"
set_tag "$BAD"
if kubectl argo rollouts status api-gateway -n "$NS" --timeout 600s; then
  echo "  [AVISO] $BAD fue promovida: el analisis no la detecto (se cumple 10/10 solo si el canary no recibio trafico). Repita."
else
  ok "Rollout abortado por el analisis (rollback automatico)"
fi
kubectl get analysisrun -n "$NS"

log "3/3 Git de vuelta a $GOOD (deja el estado sano)"
set_tag "$GOOD"
kubectl argo rollouts status api-gateway -n "$NS" --timeout 600s
kubectl argo rollouts get rollout api-gateway -n "$NS"
kubectl get analysisrun -n "$NS"

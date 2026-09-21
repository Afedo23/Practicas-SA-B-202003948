#!/usr/bin/env bash
# Ejecuta el script de calificacion (1_0_script_p8.sh) contra el cluster.
# Uso:  ./04_grader.sh [ruta/a/1_0_script_p8.sh]
# Requiere el cluster encendido y kubectl apuntando a el.
set -uo pipefail
source "$(dirname "$0")/config.sh"

GRADER="${1:-}"
if [ -z "$GRADER" ]; then
  for c in "$ROOT/P8/1_0_script_p8.sh" "$ROOT/1_0_script_p8.sh" "$PWD/1_0_script_p8.sh"; do
    [ -f "$c" ] && { GRADER="$c"; break; }
  done
fi
[ -f "$GRADER" ] || die "No encuentro 1_0_script_p8.sh. Pase la ruta como argumento."
GRADER="$(cd "$(dirname "$GRADER")" && pwd)/$(basename "$GRADER")"
cd "$(dirname "$GRADER")"                       # el grader lee p8.conf del directorio actual

kubectl get ns >/dev/null 2>&1 || die "Sin acceso al cluster"

# --- p8.conf: se genera solo la primera vez. DEBE coincidir con la tabla 4.1 del README.
if [ ! -f p8.conf ]; then
  OWNER="$(echo "$GITOPS_URL" | sed -E 's|https://github.com/([^/]+)/.*|\1|')"
  REPO_CODE="${REPO_CODE:-}"
  [ -n "$REPO_CODE" ] || read -r -p "URL del repo de codigo (https://github.com/$OWNER/...): " REPO_CODE
  IMAGE="${IMAGE:-$(kubectl get rollout api-gateway -n "$NS" -o jsonpath='{.spec.template.spec.containers[0].image}')}"
  cat > p8.conf <<CONF
CARNET="$CARNET"
REPO_CODE="$REPO_CODE"
REPO_GITOPS="$GITOPS_URL"
APP="$APP"
NS="$NS"
IMAGE="$IMAGE"
COSIGN_IDENTITY_REGEXP="https://github.com/$OWNER/.*"
COSIGN_ISSUER="https://token.actions.githubusercontent.com"
CONF
  ok "Generado p8.conf (revise que coincida con el README)"
fi
cat p8.conf

# --- Sesion de ArgoCD (opcional; sin ella el grader consulta el CRD con kubectl)
PF=""
trap '[ -n "$PF" ] && kill "$PF" 2>/dev/null' EXIT
if command -v argocd >/dev/null 2>&1; then
  kubectl port-forward svc/argocd-server -n argocd 8443:443 >/dev/null 2>&1 & PF=$!
  sleep 5
  PASS="$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' 2>/dev/null | base64 -d)"
  argocd login localhost:8443 --insecure --grpc-web --username admin --password "$PASS" >/dev/null 2>&1 \
    && ok "Sesion de ArgoCD iniciada" || echo "  [AVISO] Sin sesion de ArgoCD; el grader usara kubectl"
fi

# --- Ejecucion.
# NSUB=0: el grader usa NSUB en la seccion 2.2 sin inicializarlo y, con 'set -u',
# aborta ahi ("NSUB: unbound variable"). Es un fallo del script, no de la practica.
# Inicializarlo desde el entorno no altera el script ni el puntaje.
NSUB=0 bash "./$(basename "$GRADER")"
echo; echo "Reporte: $(pwd)/reporte_p8_${CARNET}.txt   CSV: $(pwd)/resultados_p8.csv"

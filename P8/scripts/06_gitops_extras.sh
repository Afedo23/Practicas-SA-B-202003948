#!/usr/bin/env bash
# Agrega al repo GitOps, por commit + push (ArgoCD lo aplica):
#   - 4 politicas Kyverno            -> manifests/policies/
#   - 1 SealedSecret (secreto cifrado) -> manifests/sealedsecret-api-gateway.yaml
#   - Application con ignoreDifferences para los defaults de Kyverno
# Requiere haber ejecutado 03. Idempotente.
set -euo pipefail
source "$(dirname "$0")/config.sh"

[ -d "$GITOPS_DIR/.git" ] || die "No encuentro el clon del repo GitOps en $GITOPS_DIR (defina GITOPS_DIR)"
kubectl get crd clusterpolicies.kyverno.io sealedsecrets.bitnami.com >/dev/null 2>&1 \
  || die "Faltan Kyverno o Sealed Secrets en el cluster. Ejecute 03_argocd_rollouts.sh"
command -v jq >/dev/null 2>&1 || die "Se necesita jq (respaldo de la llave)"
KFILE="$GITOPS_DIR/manifests/kustomization.yaml"
[ -f "$KFILE" ] || die "No existe $KFILE"

add_resource() {   # agrega "- <ruta>" a resources: de kustomization.yaml si no esta
  grep -qE "^[[:space:]]*-[[:space:]]+$1[[:space:]]*$" <(tr -d '\r' < "$KFILE") \
    || sed -i "0,/^resources:.*/s||&\n- $1|" "$KFILE"
}

ensure_kubeseal() {
  command -v kubeseal >/dev/null 2>&1 && return 0
  log "Descargando kubeseal ${SEALED_VERSION}"
  local os ext="" arch=amd64 v="${SEALED_VERSION#v}"
  case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) os=windows; ext=.exe;; Darwin) os=darwin;; *) os=linux;; esac
  case "$(uname -m)" in arm64|aarch64) arch=arm64;; esac
  mkdir -p "$HOME/bin"
  curl -sSL "https://github.com/bitnami/sealed-secrets/releases/download/${SEALED_VERSION}/kubeseal-${v}-${os}-${arch}.tar.gz" \
    | tar -xz -C "$HOME/bin" "kubeseal${ext}"
  export PATH="$HOME/bin:$PATH"
  command -v kubeseal >/dev/null 2>&1 || die "No se pudo instalar kubeseal"
}

log "1/4 Politicas Kyverno"
mkdir -p "$GITOPS_DIR/manifests/policies"
cp "$EXTRAS"/policies/*.yaml "$GITOPS_DIR/manifests/policies/"
add_resource policies
ok "4 politicas copiadas a manifests/policies/"

log "2/4 SealedSecret api-gateway-secrets"
SFILE="$GITOPS_DIR/manifests/sealedsecret-api-gateway.yaml"
have_secret() { kubectl get secret api-gateway-secrets -n "$NS" >/dev/null 2>&1; }
if [ -f "$SFILE" ] && ! have_secret; then      # ya esta en Git: dar tiempo a que ArgoCD lo aplique
  for _ in $(seq 1 12); do have_secret && break; sleep 5; done
fi
if have_secret; then
  ok "El secreto ya existe en el cluster (el controlador descifra el SealedSecret de Git)"
else
  ensure_kubeseal
  kubectl create secret generic api-gateway-secrets -n "$NS" \
      --from-literal=JWT_SECRET="$(openssl rand -hex 32)" --dry-run=client -o yaml \
    | kubeseal --controller-name sealed-secrets-controller --controller-namespace kube-system \
               --format yaml > "$SFILE"
  add_resource sealedsecret-api-gateway.yaml
  ok "SealedSecret generado (solo contiene el valor cifrado)"
fi

log "3/4 Respaldo de la llave de Sealed Secrets (fuera del repo)"
mkdir -p "$(dirname "$KEY_BACKUP")"
kubectl get secret -n kube-system -l sealedsecrets.bitnami.com/sealed-secrets-key -o json \
  | jq '{apiVersion:"v1",kind:"List",items:[.items[]|del(.metadata.uid,.metadata.resourceVersion,.metadata.creationTimestamp,.metadata.managedFields,.metadata.ownerReferences)]}' \
  > "$KEY_BACKUP"
chmod 600 "$KEY_BACKUP" 2>/dev/null || true
ok "Llave respaldada en $KEY_BACKUP  (NO la suba a Git: descifra todos sus secretos)"

log "4/4 Commit + push al repo GitOps y registro de la Application"
mkdir -p "$GITOPS_DIR/apps"
cp "$EXTRAS/apps/sa-platform-application.yaml" "$GITOPS_DIR/apps/"
( cd "$GITOPS_DIR" \
  && git add manifests apps \
  && { git diff --cached --quiet || git commit -q -m "feat(p8): politicas Kyverno, SealedSecret e ignoreDifferences"; } \
  && git pull -q --rebase origin main \
  && git push -q origin main ) || die "Fallo git en $GITOPS_DIR (¿cambios sin commit o conflicto?)"
kubectl apply -f "$GITOPS_DIR/apps/sa-platform-application.yaml"
kubectl annotate application "$APP" -n argocd argocd.argoproj.io/refresh=hard --overwrite >/dev/null

log "Esperando Synced/Healthy"
st=""
for i in $(seq 1 30); do
  st=$(kubectl get application "$APP" -n argocd -o jsonpath='{.status.sync.status}/{.status.health.status}' 2>/dev/null || true)
  echo "  [$i/30] ${st:-sin estado}"; [ "$st" = "Synced/Healthy" ] && break; sleep 10
done
kubectl get clusterpolicy
kubectl get sealedsecret,secret -n "$NS"
[ "$st" = "Synced/Healthy" ] && ok "Application sincronizada con politicas y secreto" \
  || die "La Application no quedo Synced/Healthy: kubectl describe application $APP -n argocd"

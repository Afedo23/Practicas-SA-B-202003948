#!/usr/bin/env bash
# Instala ArgoCD, Argo Rollouts, Kyverno y Sealed Secrets (server-side: los CRD superan el
# limite de anotaciones) y registra la Application. Desde aqui, ArgoCD es el UNICO que despliega.
set -euo pipefail
source "$(dirname "$0")/config.sh"

kubectl get namespace "$NS" >/dev/null 2>&1 || die "No existe el namespace $NS. Ejecute 02_terraform.sh antes"

log "ArgoCD"
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
kubectl apply --server-side --force-conflicts -n argocd \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
# t3.small admite ~11 pods por nodo: se apagan los componentes de ArgoCD que esta practica no usa.
kubectl -n argocd scale deployment argocd-dex-server argocd-notifications-controller \
  argocd-applicationset-controller --replicas=0
kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n argocd
kubectl wait --for=condition=available --timeout=300s deployment/argocd-repo-server -n argocd
kubectl rollout status statefulset/argocd-application-controller -n argocd --timeout=300s

log "Argo Rollouts"
kubectl create namespace argo-rollouts --dry-run=client -o yaml | kubectl apply -f -
kubectl apply --server-side --force-conflicts -n argo-rollouts \
  -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml
kubectl wait --for=condition=available --timeout=300s deployment/argo-rollouts -n argo-rollouts

log "Kyverno $KYVERNO_VERSION (motor de politicas)"
kubectl apply --server-side --force-conflicts \
  -f "https://github.com/kyverno/kyverno/releases/download/$KYVERNO_VERSION/install.yaml"
kubectl wait --for=condition=available --timeout=300s deployment --all -n kyverno

log "Sealed Secrets $SEALED_VERSION (secretos cifrados en Git)"
if [ -f "$KEY_BACKUP" ]; then
  echo "  Restaurando la llave de cifrado respaldada (los SealedSecret existentes seguiran siendo validos)"
  kubectl apply -f "$KEY_BACKUP"
fi
kubectl apply -f "https://github.com/bitnami/sealed-secrets/releases/download/$SEALED_VERSION/controller.yaml"
kubectl rollout status deployment/sealed-secrets-controller -n kube-system --timeout=300s

log "CRD listos"
kubectl wait --for=condition=Established --timeout=120s \
  crd/applications.argoproj.io crd/rollouts.argoproj.io crd/analysistemplates.argoproj.io \
  crd/analysisruns.argoproj.io crd/clusterpolicies.kyverno.io crd/sealedsecrets.bitnami.com

log "Application $APP (se aplica una sola vez; despues manda Git)"
APP_URL="${GITOPS_URL/github.com/raw.githubusercontent.com}/main/apps/sa-platform-application.yaml"
kubectl apply -f "$APP_URL"

log "Esperando Synced/Healthy (hasta 10 min)"
st=""
for i in $(seq 1 60); do
  st=$(kubectl get application "$APP" -n argocd \
        -o jsonpath='{.status.sync.status}/{.status.health.status}' 2>/dev/null || true)
  echo "  [$i/60] ${st:-sin estado}"
  [ "$st" = "Synced/Healthy" ] && break
  sleep 10
done
[ "$st" = "Synced/Healthy" ] || die "La app no llego a Synced/Healthy. Revise: kubectl describe application $APP -n argocd (¿existe la imagen del tag en GHCR?)"

log "Estado final"
kubectl get application -n argocd
kubectl get pods,svc -n "$NS"
kubectl argo rollouts get rollout api-gateway -n "$NS" 2>/dev/null || true
PEND=$(kubectl get pods -A --field-selector=status.phase=Pending --no-headers 2>/dev/null | wc -l)
[ "$PEND" -eq 0 ] || echo "  [AVISO] $PEND pod(s) Pending: probablemente falta capacidad (limite de pods por nodo t3.small)"

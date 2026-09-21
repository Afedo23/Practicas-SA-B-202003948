#!/usr/bin/env bash
# Destruye TODO para no seguir pagando. El ELB se libera ANTES de borrar el cluster.
set -uo pipefail
source "$(dirname "$0")/config.sh"

read -r -p "Esto borra la app, Terraform y el cluster $CLUSTER_NAME. Escriba 'si' para continuar: " R
[ "$R" = "si" ] || { echo "Cancelado"; exit 0; }

log "1/4 Quitando la Application (sin cascada: evita que selfHeal recree el Service)"
kubectl delete application "$APP" -n argocd --ignore-not-found --wait=true

log "2/4 Liberando el ELB (Service LoadBalancer)"
kubectl delete svc api-gateway -n "$NS" --ignore-not-found --wait=true --timeout=300s

log "3/4 terraform destroy"
terraform -chdir="$TF_DIR" destroy -auto-approve -input=false \
  -var "cluster_name=$CLUSTER_NAME" -var "aws_region=$AWS_REGION"

log "4/4 Eliminando el cluster"
eksctl delete cluster --name "$CLUSTER_NAME" --region "$AWS_REGION" --wait
ok "Todo eliminado. Verifique en la consola AWS que no queden ELB ni volumenes EBS."

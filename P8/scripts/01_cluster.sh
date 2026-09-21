#!/usr/bin/env bash
# Levanta el cluster EKS (idempotente: si ya existe, solo actualiza el kubeconfig).
set -euo pipefail
source "$(dirname "$0")/config.sh"

log "Cluster EKS $CLUSTER_NAME ($AWS_REGION)"
if eksctl get cluster --name "$CLUSTER_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
  ok "El cluster ya existe, no se recrea"
else
  echo "  Creando cluster (tarda 15-20 min)..."
  eksctl create cluster -f "$CLUSTER_YAML"
fi

log "Kubeconfig"
aws eks update-kubeconfig --name "$CLUSTER_NAME" --region "$AWS_REGION"

log "Esperando nodos Ready"
kubectl wait --for=condition=Ready nodes --all --timeout=300s
kubectl get nodes -o wide

log "StorageClass gp3"
kubectl apply -f "$STORAGECLASS_YAML"

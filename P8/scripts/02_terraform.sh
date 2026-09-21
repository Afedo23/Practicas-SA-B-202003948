#!/usr/bin/env bash
# Aplica Terraform: namespace sa-p8, ResourceQuota, LimitRange y RBAC.
# Terraform NO crea el cluster ni despliega la aplicacion (eso lo hace ArgoCD).
set -euo pipefail
source "$(dirname "$0")/config.sh"

kubectl cluster-info >/dev/null 2>&1 || die "kubectl no llega al cluster. Ejecute 01_cluster.sh"

log "terraform init / validate / plan"
terraform -chdir="$TF_DIR" init -input=false
terraform -chdir="$TF_DIR" validate
terraform -chdir="$TF_DIR" plan -input=false -var "cluster_name=$CLUSTER_NAME" -var "aws_region=$AWS_REGION" -out=tfplan

log "terraform apply"
terraform -chdir="$TF_DIR" apply -input=false tfplan
rm -f "$TF_DIR/tfplan"

log "Verificacion"
kubectl get namespace "$NS"
kubectl get resourcequota,limitrange,role,rolebinding,serviceaccount -n "$NS"

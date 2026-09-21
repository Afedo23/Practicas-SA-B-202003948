#!/usr/bin/env bash
# Verifica herramientas y credenciales AWS antes de empezar.
set -uo pipefail
source "$(dirname "$0")/config.sh"

log "Herramientas"
REQ=(aws eksctl kubectl terraform git)          # sin estas no se puede levantar nada
CAL=(helm jq trivy cosign)                       # las usa el script de calificacion
OPC=(argocd k6)                                # opcionales: argocd (el grader cae a kubectl), k6 (07)
falta_req=(); falta_cal=(); falta_opc=()
for t in "${REQ[@]}"; do command -v "$t" >/dev/null 2>&1 || falta_req+=("$t"); done
for t in "${CAL[@]}"; do command -v "$t" >/dev/null 2>&1 || falta_cal+=("$t"); done
for t in "${OPC[@]}"; do command -v "$t" >/dev/null 2>&1 || falta_opc+=("$t"); done
kubectl argo rollouts version >/dev/null 2>&1 || falta_cal+=("kubectl-argo-rollouts")

[ ${#falta_req[@]} -eq 0 ] && ok "Herramientas base presentes" || die "Faltan: ${falta_req[*]}"
[ ${#falta_cal[@]} -eq 0 ] || echo "  [AVISO] Faltan para la calificacion: ${falta_cal[*]}"
[ ${#falta_opc[@]} -eq 0 ] || echo "  [AVISO] Opcionales ausentes: ${falta_opc[*]}"

log "Credenciales AWS"
aws sts get-caller-identity --query Arn --output text >/dev/null 2>&1 \
  || die "Sin credenciales AWS. Ejecute 'aws configure' (region $AWS_REGION)."
ok "AWS: $(aws sts get-caller-identity --query Arn --output text)"

log "Archivos de la practica"
for f in "$CLUSTER_YAML" "$STORAGECLASS_YAML" "$TF_DIR/main.tf"; do
  [ -f "$f" ] && ok "$f" || die "No existe $f (ejecute desde el repo de practicas)"
done

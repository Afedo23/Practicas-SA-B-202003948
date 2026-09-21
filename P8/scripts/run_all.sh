#!/usr/bin/env bash
# Levantamiento completo: prereqs -> cluster -> terraform -> argocd/rollouts/kyverno/sealed-secrets -> extras GitOps.
set -euo pipefail
D="$(cd "$(dirname "$0")" && pwd)"
bash "$D/00_prereqs.sh"
bash "$D/01_cluster.sh"
bash "$D/02_terraform.sh"
bash "$D/03_argocd_rollouts.sh"
bash "$D/06_gitops_extras.sh"
echo; echo "Listo. Siguientes pasos:"
echo "  bash $D/07_k6.sh                              # prueba de carga (evidencia)"
echo "  bash $D/05_demo_rollback.sh <bueno> <malo>    # canary + rollback (evidencia)"
echo "  bash $D/04_grader.sh /ruta/a/1_0_script_p8.sh # autoevaluacion"

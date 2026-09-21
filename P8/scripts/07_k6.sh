#!/usr/bin/env bash
# Prueba de carga con k6 contra el api-gateway. Guarda la evidencia en P8/evidence/k6-result.txt.
# Uso:  ./07_k6.sh                 (usa port-forward al Service)
#       BASE_URL=http://<elb>:8080 ./07_k6.sh
set -uo pipefail
source "$(dirname "$0")/config.sh"

OUT="$ROOT/P8/evidence"
# Busca k6-load.js en cualquier subcarpeta de P8 (tests/k6, test/K6, ...), sin importar mayusculas.
TEST="$(find "$ROOT/P8" -type f -iname 'k6-load.js' -not -path '*/.terraform/*' 2>/dev/null | head -n 1)"
[ -n "$TEST" ] && [ -f "$TEST" ] || die "No encuentro k6-load.js dentro de $ROOT/P8. Copie el archivo a P8/tests/k6/."
echo "  Script de k6: $TEST"
command -v k6 >/dev/null 2>&1 || command -v k6.exe >/dev/null 2>&1 || die "k6 no esta instalado (Windows: winget install k6 | https://k6.io/docs/get-started/installation/)"
mkdir -p "$OUT"

# Ruta del script segun el k6 que se va a ejecutar:
#  - k6 de Windows (.exe, o un binario bajo /mnt/...) -> ruta de Windows (J:/...)
#  - k6 de Linux/WSL o Git Bash sin .exe             -> ruta tal cual
K6_BIN="$(command -v k6 2>/dev/null || command -v k6.exe 2>/dev/null)"
K6_CMD="$(basename "$K6_BIN")"
K6_TEST="$TEST"
case "$K6_BIN" in
  *.exe|/mnt/*)
    if command -v cygpath >/dev/null 2>&1; then K6_TEST="$(cygpath -m "$TEST")"
    elif command -v wslpath >/dev/null 2>&1; then K6_TEST="$(wslpath -m "$TEST")"
    fi ;;
esac
echo "  k6: $K6_BIN"

PF=""; PFLOG="$(mktemp)"
trap '[ -n "$PF" ] && kill "$PF" 2>/dev/null; rm -f "$PFLOG"' EXIT
if [ -z "${BASE_URL:-}" ]; then
  kubectl port-forward svc/api-gateway -n "$NS" 18080:8080 >"$PFLOG" 2>&1 & PF=$!
  BASE_URL="http://localhost:18080"
fi
# Verifica que el servicio responde ANTES de lanzar la carga (falla rapido si no).
ok_health=""
for _ in $(seq 1 15); do
  if curl -fsS --max-time 3 "$BASE_URL/health" >/dev/null 2>&1; then ok_health=1; break; fi
  if [ -n "$PF" ] && ! kill -0 "$PF" 2>/dev/null; then break; fi
  sleep 1
done
if [ -z "$ok_health" ]; then
  [ -s "$PFLOG" ] && { echo "--- salida de kubectl port-forward ---"; cat "$PFLOG"; echo "--------------------------------------"; }
  die "No hay respuesta en $BASE_URL/health. Compruebe 'kubectl get svc -n $NS' (¿el kubectl de este shell apunta al cluster?) o use BASE_URL=http://<hostname-del-ELB>:8080"
fi
ok "El servicio responde en $BASE_URL/health"
log "k6 contra $BASE_URL"
"$K6_CMD" run -e BASE_URL="$BASE_URL" "$K6_TEST" 2>&1 | tee "$OUT/k6-result.txt"
RC=${PIPESTATUS[0]}
[ "$RC" -eq 0 ] && ok "Umbrales cumplidos" || echo "  [FALLA] Umbrales incumplidos (codigo $RC)"
exit "$RC"
# Evidencia de ejecución

Este archivo es el lugar donde deben ir las capturas de pantalla del
pipeline corriendo exitosamente, tal como pide el entregable "Evidencia de
ejecución" de la rúbrica.

Después de hacer push del código (incluyendo `.github/workflows/p7-cicd.yml`)
a tu repositorio real de GitHub y de configurar los secrets (ver sección 3
del [README](../README.md)):

1. Ve a la pestaña **Actions** del repositorio.
2. Espera a que el workflow **"P7 - CI/CD sa-platform"** corra completo.
3. Toma capturas de:
   - La vista general del workflow con los 4 jobs en verde
     (`test-node`, `test-python`, `docker-build-push`, `deploy`).
   - El log de `npm test` / `pytest` de al menos un servicio de cada
     lenguaje, mostrando las pruebas en verde.
   - El log del job `docker-build-push` mostrando el `docker push` exitoso
     a `ghcr.io`.
   - El log del job `deploy` con la salida de `helm upgrade --install` y de
     `kubectl get pods -n sa-p6` mostrando los pods en `Running`.
   - Los paquetes publicados en GHCR (`https://github.com/<owner>?tab=packages`).
4. Guarda las imágenes en esta carpeta (`P7/evidencia/`) con nombres
   descriptivos, por ejemplo:
   - `01-workflow-overview.png`
   - `02-test-node.png`
   - `03-test-python.png`
   - `04-docker-push.png`
   - `05-deploy-helm.png`
   - `06-pods-running.png`

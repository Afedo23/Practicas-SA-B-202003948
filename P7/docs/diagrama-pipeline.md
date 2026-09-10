# Diagrama del pipeline

```mermaid
flowchart TD
    A["git push a main / tag p7-v*<br/>o Pull Request"] --> B{"Trigger workflow<br/>p7-cicd.yml"}

    B --> C1["Job: test-node<br/>(matriz x5 servicios)"]
    B --> C2["Job: test-python<br/>(matriz x2 servicios)"]

    C1 --> C1a["npm ci"]
    C1a --> C1b["npm run build (tsc)"]
    C1b --> C1c["npm test"]

    C2 --> C2a["pip install -r requirements*.txt"]
    C2a --> C2b["pytest"]

    C1c --> D{"¿Todo paso?"}
    C2b --> D

    D -- "no" --> X["Pipeline falla<br/>clúster no se toca"]
    D -- "si" --> E["Job: docker-build-push<br/>(matriz x8 imagenes)"]

    E --> E1["docker build"]
    E1 --> E2["Login GHCR (GITHUB_TOKEN)"]
    E2 --> E3["docker push<br/>ghcr.io/owner/sa-p7/&lt;servicio&gt;:sha<br/>+ :latest"]

    E3 --> F{"¿Evento == push?<br/>(no en Pull Request)"}
    F -- "no (es PR)" --> Y["Termina aqui:<br/>solo valido el cambio"]
    F -- "si" --> G["Job: deploy"]

    G --> G1["configure-aws-credentials"]
    G1 --> G2["aws eks update-kubeconfig<br/>(cluster EKS de P6)"]
    G2 --> G3["helm dependency build"]
    G3 --> G4["helm upgrade --install sa-platform<br/>-n sa-p6 --set image.tag=sha (x7 subcharts)"]
    G4 --> G5["kubectl get pods -n sa-p6<br/>(verificacion de rollout)"]
```

**Fases (según lo pedido en el enunciado):**

1. **Validar cambios automáticamente** → jobs `test-node` + `test-python`.
2. **Construir imágenes Docker** → job `docker-build-push` (build).
3. **Ejecutar pruebas** → jobs `test-node` + `test-python` (antes de construir
   imágenes, para no publicar nada roto).
4. **Desplegar servicios sin intervención manual** → job `deploy` (`helm
   upgrade --install` automático sobre el clúster EKS de la Práctica 6).

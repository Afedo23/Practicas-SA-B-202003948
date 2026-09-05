# Práctica 6 — Despliegue de la plataforma en un clúster de Kubernetes en la nube

**Curso:** Software Avanzado — FIUSAC, USAC
**Carné:** 202003948
**Proveedor:** AWS (EKS)
**Región:** us-east-2 (Ohio) — se usa esta región

Esta práctica toma la plataforma construida en la Práctica 5 (chart de Helm
`sa-platform`: frontend, api-gateway, auth-service, solicitudes-service,
aprobaciones-service, notificaciones-service, dos CronJobs, PostgreSQL y
RabbitMQ) y la despliega, sin reescribirla, sobre un clúster de Kubernetes
administrado (Amazon EKS), publicando las imágenes en Amazon ECR y
exponiendo el sistema con un `Service` de tipo `LoadBalancer`.

---

## 1. Requisitos previos (en la máquina del estudiante)

```bash
# AWS CLI v2
aws --version

# eksctl
curl -sLO "https://github.com/eksctl-io/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz"
tar -xzf eksctl_$(uname -s)_amd64.tar.gz -C /tmp && sudo mv /tmp/eksctl /usr/local/bin
eksctl version

# kubectl y Helm ya se usaron en P5
kubectl version --client
helm version
```

Configurar credenciales del usuario IAM (ver sección 2):

```bash
aws configure
# AWS Access Key ID: ...
# AWS Secret Access Key: ...
# Default region name: us-east-2
```

---

## 2. Usuario IAM y política de permisos

Se crea un usuario IAM dedicado a esta práctica (no se usa el usuario root ni
credenciales del root de la cuenta), con una política personalizada en vez
de `AdministratorAccess`, acotada a lo que `eksctl` necesita para crear el
clúster vía CloudFormation, más ECR y ELB:

```bash
aws iam create-user --user-name sa-p6-student

aws iam create-policy \
  --policy-name SA-P6-EKSCTL-Policy \
  --policy-document file://aws/iam-policy-eksctl-user.json

aws iam attach-user-policy \
  --user-name sa-p6-student \
  --policy-arn arn:aws:iam::<AWS_ACCOUNT_ID>:policy/SA-P6-EKSCTL-Policy

aws iam create-access-key --user-name sa-p6-student
# Guardar AccessKeyId/SecretAccessKey de forma segura (no se versionan)
```

El JSON completo de la política está en
[`aws/iam-policy-eksctl-user.json`](./aws/iam-policy-eksctl-user.json).
Está basada en la tabla de niveles de acceso mínimos que publica `eksctl` en
su propia documentación (CloudFormation Full, EKS Full, EC2/AutoScaling/IAM
limitados a lo necesario para crear la VPC, los nodos y los roles), más
`ecr:*` (publicar imágenes) y `elasticloadbalancing:*` (para que el
`Service` tipo `LoadBalancer` pueda aprovisionar el ELB). Es más amplia que
un policy "mínimo ideal" porque `eksctl` orquesta todo vía CloudFormation y
necesita poder crear/gestionar esos recursos subyacentes (VPC, subnets,
security groups, roles de IAM para el clúster y los nodos); ver la
respuesta a la pregunta 4 para la discusión de esta compensación.

---

## 3. Creación del clúster EKS

```bash
eksctl create cluster -f aws/cluster-us-east-2.yaml
# tarda entre 15-20 minutos (EKS crea el control plane administrado + 2 nodos)

kubectl get nodes
# debe mostrar 2 nodos en estado Ready
```

Config completa en [`aws/cluster-us-east-2.yaml`](./aws/cluster-us-east-2.yaml):
2 nodos `t3.medium` (mínimo razonable para ~13 pods con los `resources`
definidos en el chart), `withOIDC: true` (necesario para el addon de EBS) y
los addons administrados `vpc-cni`, `coredns`, `kube-proxy` y
`aws-ebs-csi-driver`.

### StorageClass (EKS no trae una por defecto)

```bash
kubectl apply -f aws/storageclass-gp3.yaml
kubectl get storageclass
```

---

## 4. Registro de contenedores (Amazon ECR) — publicar las 8 imágenes

```bash
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=us-east-2

aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

for svc in frontend api-gateway auth-service solicitudes-service aprobaciones-service notificaciones-service cronjob-registro cronjob-resumen; do
  aws ecr create-repository --repository-name sa-p6/$svc --region $AWS_REGION || true
done

# Build + push (rutas relativas a la carpeta P5 del repo)
docker build -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/sa-p6/frontend:latest ./P5/frontend
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/sa-p6/frontend:latest

docker build -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/sa-p6/api-gateway:latest ./P5/api-gateway
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/sa-p6/api-gateway:latest

docker build -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/sa-p6/auth-service:latest ./P5/auth-service
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/sa-p6/auth-service:latest

docker build -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/sa-p6/solicitudes-service:latest ./P5/solicitudes-service
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/sa-p6/solicitudes-service:latest

docker build -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/sa-p6/aprobaciones-service:latest ./P5/aprobaciones-service
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/sa-p6/aprobaciones-service:latest

docker build -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/sa-p6/notificaciones-service:latest ./P5/notificaciones-service
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/sa-p6/notificaciones-service:latest

docker build -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/sa-p6/cronjob-registro:latest ./P5/cronjobs/cronjob1-registro
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/sa-p6/cronjob-registro:latest

docker build -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/sa-p6/cronjob-resumen:latest ./P5/cronjobs/cronjob2-resumen
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/sa-p6/cronjob-resumen:latest
```

<!-- INSERTAR CAPTURA: consola de Amazon ECR mostrando los 8 repositorios con al menos una imagen "latest" -->

---

## 5. Chart adaptado al proveedor

El chart de `../P5/charts/sa-platform` ya viene modificado para esta
práctica (no se reescribe la app, solo se adapta la infraestructura):

1. **`Service` configurable como `LoadBalancer`** — `api-gateway` y
   `frontend` tenían `type: ClusterIP` fijo en el template
   (`charts/api-gateway/templates/service.yaml` y
   `charts/frontend/templates/service.yaml`). Ya se parametrizó vía
   `.Values.service.type | default "ClusterIP"`, así que el mismo chart
   sigue funcionando igual en local (P5) y en AWS (P6).
2. **`values-aws.yaml`** — overlay nuevo, ya agregado en
   `P5/charts/sa-platform/values-aws.yaml`, con: repos de imagen apuntando
   a ECR, `service.type: LoadBalancer` en api-gateway/frontend,
   `storageClassName: gp3` para PostgreSQL y RabbitMQ, y `mailpit`
   deshabilitado.

Las credenciales (`secrets.db.*`, `secrets.broker.*`, `secrets.jwtSecret`,
`postgresql.auth.*`, `rabbitmq.auth.*`) siguen viviendo únicamente en
`values.local.yaml`, que **no se versiona** (mismo `.gitignore` que en P5) —
se convierten en `Secret` de Kubernetes vía Helm, nunca en texto plano en el
repositorio.

Solo falta que reemplaces `<AWS_ACCOUNT_ID>`/`<REGION>` dentro de
`P5/charts/sa-platform/values-aws.yaml` (ya con tus valores reales de la
sección 2/4), y luego:

```bash
cd P5/charts/sa-platform
helm dependency build   # repackagea api-gateway y frontend con el Service ya parametrizado
helm upgrade --install sa-platform . -n sa-p6 --create-namespace \
  -f values.local.yaml -f values-aws.yaml
```

---

## 6. Ajuste de capacidad de los nodos (límite de pods por nodo)

Con `replicaCount: 2` (el valor por defecto de P5, heredado tal cual en el
primer `helm install` de esta práctica) varios pods quedaron en `Pending`.
El `describe pod` mostró la causa real:

```
Warning  FailedScheduling  0/2 nodes are available: 2 Too many pods.
Warning  FailedCreatePodSandBox  ... plugin type="aws-cni" ... failed to assign an IP address to container
```

No es un problema de CPU/memoria — de hecho `kubectl describe nodes | grep -A5
"Allocated resources"` mostraba los nodos con margen de sobra (43-48% CPU,
81-82% memoria en *requests*). El límite real es de **direcciones IP por
ENI**: en AWS, el VPC CNI asigna una IP de la VPC a cada pod, y una
`t3.medium` solo soporta 11 pods por nodo (`kubectl get nodes -o
custom-columns=NAME:.metadata.name,MAXPODS:.status.allocatable.pods`), sin
importar cuánta CPU/RAM le sobre. Con 2 nodos, el tope son 22 pods — y entre
6 microservicios a 2 réplicas + Postgres + RabbitMQ + frontend + CronJobs
concurrentes, se llegaba justo a ese límite.

La complicación adicional: bajar `replicaCount: 1` en `values-aws.yaml` no
alcanzaba, porque el `HorizontalPodAutoscaler` de cada subchart traía
`minReplicas: 2` fijo en su propio `values.yaml`, y el HPA reescala de
vuelta a su mínimo apenas ve el Deployment con menos réplicas de las que él
espera. Hubo que sobreescribir **ambos** valores para cada microservicio en
`values-aws.yaml`:

```yaml
api-gateway:
  replicaCount: 1
  hpa:
    minReplicas: 1
    maxReplicas: 2
  image:
    repository: <AWS_ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/sa-p6/api-gateway
    tag: "latest"
  service:
    type: LoadBalancer

auth-service:
  replicaCount: 1
  hpa:
    minReplicas: 1
    maxReplicas: 2
  image:
    repository: <AWS_ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/sa-p6/auth-service
    tag: "latest"

# mismo patrón (replicaCount: 1 + hpa.minReplicas: 1 / maxReplicas: 2) en
# aprobaciones-service, notificaciones-service y solicitudes-service
```

Tras el `helm upgrade` con este overlay:

```bash
kubectl get hpa -n sa-p6
```

confirma `MINPODS 1` / `REPLICAS 1` en los 5 microservicios, y `kubectl get
pods -n sa-p6` ya no muestra ningún pod de la plataforma en `Pending` de
forma sostenida.

<!-- INSERTAR CAPTURA: kubectl get hpa -n sa-p6 con MINPODS/REPLICAS en 1 -->

**Nota:** los CronJobs (`cronjob-registro`, `cronjob-resumen`) sí pueden
quedar brevemente en `Pending`/`FailedCreatePodSandBox` cuando coinciden
varias ejecuciones a la vez con la plataforma ya usando casi todos los
slots — esto es transitorio y se resuelve solo apenas otro pod completa su
ejecución y libera una IP; no requiere ninguna acción manual.

---

## 7. Verificación desde dentro del clúster

```bash
kubectl get pods -n sa-p6
kubectl get pvc -n sa-p6
```

<!-- INSERTAR CAPTURA: kubectl get pods -n sa-p6 con todos los pods 1/1 Running/Completed -->
<!-- INSERTAR CAPTURA: consola de AWS > EKS > sa-p6-cluster mostrando el clúster y los 2 nodos -->

---

## 8. Exposición pública y verificación desde internet

```bash
kubectl get svc -n sa-p6 sa-platform-api-gateway
# EXTERNAL-IP mostrará un hostname *.elb.us-east-2.amazonaws.com (ELB clásico
# aprovisionado automáticamente por el cloud-controller-manager de EKS al
# ver un Service tipo LoadBalancer, sin instalar ningún controller adicional)

export GATEWAY_URL=$(kubectl get svc -n sa-p6 sa-platform-api-gateway \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

curl -i http://$GATEWAY_URL:8080/health
```

<!-- INSERTAR CAPTURA: respuesta del curl anterior desde una terminal (o navegador) fuera del clúster -->
<!-- INSERTAR CAPTURA: petición exitosa contra el frontend usando su propio EXTERNAL-IP/hostname -->

### 8.1 Prueba funcional: login end-to-end contra el gateway público

Más allá del `/health`, se probó el flujo real de negocio desde fuera del
clúster, contra los 3 usuarios de prueba (`mgarcia`/maker,
`jchecker`/checker, `lauthorizer`/authorizer) que ya existían en la base de
datos:

```bash
curl -i -X POST http://$GATEWAY_URL:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"mgarcia","password":"admin123"}'
```

La primera vez devolvió `401 Unauthorized`. Se descartó por descarte
paso a paso: el registro existe en `authdb.usuarios` (`SELECT username, rol
FROM usuarios`), las variables `DB_*` del pod de `auth-service` apuntan a la
base correcta, y el endpoint interno (`auth-service:4001/login`) fallaba
igual desde dentro del clúster — es decir, no era un problema del
`LoadBalancer` ni del `api-gateway`, sino de los datos. Comparando el hash
guardado contra la contraseña esperada con `bcryptjs` directamente dentro
del pod (`bcrypt.compare("admin123", <hash_guardado>)`) se confirmó que el
`password_hash` de los 3 usuarios de prueba no correspondía a las
contraseñas documentadas para la demo — quedó desalineado por datos de
pruebas anteriores. Se corrigió actualizando el hash de los 3 usuarios
directamente en Postgres:

```bash
kubectl exec -n sa-p6 sa-platform-postgresql-0 -- env PGPASSWORD='<password_postgres>' \
  psql -U postgres -d authdb -c \
  "UPDATE usuarios SET password_hash = '<hash_bcrypt_valido>' WHERE username = 'mgarcia';"
# mismo patrón para jchecker y lauthorizer
```

Repitiendo el `curl` original, la respuesta fue `200 OK` con un JWT válido
(`rol` correcto en el payload), confirmando el flujo completo —
gateway público → auth-service → Postgres → emisión de token — funcionando
en el clúster administrado.

<!-- INSERTAR CAPTURA: respuesta 200 OK del login con el token JWT, desde fuera del clúster -->

---

## 9. Mailpit — visualizar los correos de prueba en el clúster

El chart ya trae a Mailpit (`charts/sa-platform/templates/mailpit.yaml`,
reutilizado tal cual de la Práctica 5) para capturar el correo de
confirmación que envían `auth-service`/`aprobaciones-service` sin depender
de credenciales reales de Gmail. En `values-aws.yaml` queda deshabilitado
por defecto (`global.mailpit.enabled: false`), ya que este ambiente no está
pensado para enviar correo real de forma permanente. Para revisar el correo
generado durante la demo/calificación, se habilita puntualmente sin tocar
el archivo versionado:

```bash
helm upgrade --install sa-platform . -n sa-p6 \
  -f values.local.yaml -f values-aws.yaml \
  --set global.mailpit.enabled=true
```

El pod de mailpit compitió brevemente por el mismo cupo de IPs por nodo
descrito en la sección 6 (quedó `Pending` con el mismo
`FailedCreatePodSandBox`), pero se resolvió solo en cuanto un pod de
CronJob terminó su ejecución y liberó una IP — no fue necesario liberar
capacidad manualmente gracias al ajuste de réplicas ya aplicado.

Como el `Service` de mailpit es `ClusterIP` (no expuesto a internet, a
propósito — solo `auth-service`/`aprobaciones-service` pueden alcanzarlo por
SMTP según la `NetworkPolicy` del chart), la interfaz web se revisa con
port-forward:

```bash
kubectl port-forward -n sa-p6 svc/sa-platform-mailpit 8025:8025
# abrir http://localhost:8025
```

<!-- INSERTAR CAPTURA: interfaz web de Mailpit mostrando el correo recibido por el login/flujo maker-checker-authorizer -->

Antes de la entrega final conviene volver a apagarlo
(`--set global.mailpit.enabled=false` + `helm upgrade`), para no dejarlo
consumiendo un slot de pod ni corriendo de forma indefinida en el clúster.

---

## 10. Costos aproximados

| Recurso | Costo aproximado (us-east-2) |
|---|---|
| Control plane EKS | USD 0.10/hora (~USD 73/mes si se deja corriendo todo el mes) |
| 2x `t3.medium` (nodos) | ~USD 0.0416/hora c/u → ~USD 0.083/hora los 2 |
| 2x volumen EBS gp3 (20Gi por nodo + 1Gi Postgres + 1Gi RabbitMQ) | fracción de centavo/hora, prácticamente despreciable |
| Network Load Balancer/Classic ELB (api-gateway + frontend) | ~USD 0.025/hora c/u + datos transferidos |
| **Total mientras el clúster está arriba** | **~USD 0.23-0.25/hora**, es decir, ~USD 1.50-2.00 por una sesión de trabajo de 6-8 horas |

<!-- INSERTAR CAPTURA: AWS Cost Explorer o Billing Dashboard mostrando el costo real acumulado de esta práctica -->

Formas de reducirlo:
- Eliminar el clúster apenas se toman las evidencias (sección 11) — es, por
  mucho, la mayor fuente de costo (control plane + nodos cobran por hora
  aunque no reciban tráfico).
- Usar 1 solo `LoadBalancer` (solo en `api-gateway`, dejando `frontend`
  como `ClusterIP` detrás del mismo gateway) en vez de dos ELB.
- Usar Spot Instances para el node group en vez de instancias on-demand.
- Aprovechar los créditos educativos/capa gratuita en vez de facturación
  directa.

---

## 11. Eliminación de recursos

```bash
# 1) Desinstalar el release (borra Deployments, Services, Secrets, PVCs quedan)
helm uninstall sa-platform -n sa-p6

# 2) Borrar los PVC explícitamente (EBS no se libera solo con el helm uninstall)
kubectl delete pvc --all -n sa-p6
kubectl delete namespace sa-p6

# 3) Borrar el clúster completo (nodos, VPC, control plane vía CloudFormation)
eksctl delete cluster -f aws/cluster-us-east-2.yaml

# 4) Borrar los repositorios ECR (si no se necesitan más)
for svc in frontend api-gateway auth-service solicitudes-service aprobaciones-service notificaciones-service cronjob-registro cronjob-resumen; do
  aws ecr delete-repository --repository-name sa-p6/$svc --region us-east-2 --force
done

# 5) (Opcional) revocar credenciales del usuario IAM usado solo para esta práctica
aws iam list-access-keys --user-name sa-p6-student
aws iam delete-access-key --user-name sa-p6-student --access-key-id <ACCESS_KEY_ID>
```

<!-- INSERTAR CAPTURA: consola de AWS confirmando que el clúster ya no existe / o la salida de "eksctl delete cluster" completada -->

---

## 12. Preguntas teóricas

### 1. ¿Qué es un clúster de Kubernetes administrado y qué diferencias tiene frente a uno local?

Un clúster administrado (EKS, GKE, AKS) es uno donde el proveedor de nube
opera y es responsable del **control plane**: el `kube-apiserver`, `etcd`,
el scheduler y el controller-manager corren en infraestructura del
proveedor, con alta disponibilidad y parches de seguridad gestionados por
él — el usuario nunca les hace SSH ni los actualiza a mano. En el clúster
local de P5 (minikube/kind), en cambio, esos mismos componentes corrían
como contenedores dentro de la misma máquina del estudiante, sin alta
disponibilidad real y sin separación de red respecto al resto del sistema
operativo.

Las diferencias que se sintieron de forma concreta en esta práctica:
- **Red:** en local, un `Service` tipo `LoadBalancer` nunca obtiene un
  `EXTERNAL-IP` real (queda en `<pending>`) porque no hay ningún componente
  que sepa aprovisionar un balanceador de verdad; en EKS, el
  cloud-controller-manager sí sabe hablar con la API de EC2/ELB y
  aprovisiona uno automáticamente.
- **Almacenamiento:** en local, la `StorageClass` "standard" usa el disco
  del propio nodo (hostPath por debajo); en EKS, `gp3` crea volúmenes EBS
  reales, independientes del ciclo de vida del pod/nodo.
- **Identidades:** en local no existe ningún concepto de credenciales de
  nube; en EKS, el propio control plane vive dentro de una cuenta de AWS
  con IAM, roles para el clúster y para los nodos, y (si se usa IRSA)
  hasta para pods individuales.
- **Costo:** el clúster local es gratis (solo consume CPU/RAM de la
  laptop); el administrado cobra por hora el control plane y los nodos
  existan o no, tengan tráfico o no.

### 2. ¿Qué es un Service de tipo LoadBalancer y cómo lo implementa el proveedor de nube?

Es uno de los cuatro tipos de `Service` de Kubernetes (junto con
`ClusterIP`, `NodePort` y `ExternalName`). A diferencia de `ClusterIP`
(solo alcanzable dentro del clúster) o `NodePort` (expone un puerto alto en
cada nodo), `LoadBalancer` le pide al **cloud-controller-manager** que
aprovisione un balanceador de carga nativo del proveedor y lo apunte hacia
los nodos del clúster en el `NodePort` que Kubernetes reserva
internamente. En AWS, al crear un `Service` con `spec.type: LoadBalancer`
sin anotaciones adicionales, el controlador crea un **Classic Load
Balancer** (o un NLB si se usan las anotaciones del AWS Load Balancer
Controller) que aparece en la consola de EC2 > Load Balancers, con una IP
pública/hostname DNS público (`*.elb.us-east-2.amazonaws.com`) que
Kubernetes reporta de vuelta en `status.loadBalancer.ingress[0].hostname`.
Es justamente ese hostname el que se usó en la sección 8 para probar el
sistema desde fuera del clúster.

### 3. ¿Qué es un registro de contenedores y por qué es necesario para desplegar en la nube?

Un registro de contenedores es un servicio que almacena y distribuye
imágenes Docker (con versionado por tags/digests), de forma similar a como
un repositorio Git almacena código. En P5, el clúster local podía usar las
imágenes directamente del daemon de Docker de la misma máquina
(`imagePullPolicy: IfNotPresent` encontraba la imagen ya construida
localmente). En un clúster administrado eso ya no es posible: los nodos de
EKS son máquinas EC2 completamente distintas a la laptop del estudiante, y
el `kubelet` de cada nodo necesita poder hacer *pull* de la imagen desde
algún lugar alcanzable por red. Por eso el paso 4 de esta práctica publica
las 8 imágenes en Amazon ECR — un registro privado dentro de la misma
cuenta de AWS, con autenticación vía IAM (`aws ecr get-login-password`), lo
que evita exponer las imágenes públicamente y mantiene el control de
acceso dentro del mismo modelo de permisos ya usado para el resto de la
práctica.

### 4. ¿Qué componentes del clúster administra el proveedor y cuáles siguen siendo responsabilidad del estudiante?

**Administrados por AWS (EKS):** el control plane completo
(`kube-apiserver`, `etcd`, scheduler, controller-manager) con su alta
disponibilidad, parcheo y actualizaciones de versión de Kubernetes; la
infraestructura física de los nodos (hardware, hipervisor); y, al usar
*managed node groups* como en esta práctica, hasta el ciclo de vida de las
EC2 (reemplazo de instancias no saludables, actualización de AMI).

**Responsabilidad del estudiante (esta práctica lo evidencia directamente):**
- Todo lo que corre *sobre* Kubernetes: los manifiestos/chart de Helm, las
  imágenes de cada microservicio y su contenido.
- La configuración de red interna: las `NetworkPolicy` que ya existían en
  P5 siguen siendo responsabilidad propia, EKS no las gestiona.
- Los `Secret` y credenciales — de hecho la política de IAM que se creó en
  la sección 2 es también responsabilidad propia: fue necesario decidir
  cuánto acceso otorgar (aquí se optó por un policy más amplio que el
  mínimo teórico porque `eksctl` necesita crear/gestionar VPC, subnets,
  security groups y roles de IAM vía CloudFormation; un policy realmente
  mínimo habría exigido crear la VPC y los roles a mano fuera de `eksctl`,
  fuera del alcance de esta práctica).
- El dimensionamiento de nodos (se eligió `t3.medium` x2, un tamaño mínimo
  razonable) y, con ello, el costo generado.
- La eliminación de los recursos al finalizar (sección 11) — EKS no borra
  nada automáticamente ni tiene un "modo pausa" gratuito.

### 5. ¿Qué costos genera el despliegue realizado y cómo podrían reducirse?

Ver el detalle en la sección 10. En resumen, el costo no proviene
principalmente del tráfico ni del almacenamiento (ambos son marginales para
una plataforma de práctica con datos mínimos), sino de dos partidas fijas
por hora: el control plane de EKS (USD 0.10/hora, fijo,
independientemente del tamaño del clúster) y los 2 nodos EC2
(`t3.medium`), a las que se suman los balanceadores de carga (uno por cada
`Service` tipo `LoadBalancer` creado). Se puede reducir:
1. Manteniendo el clúster arriba solo el tiempo estrictamente necesario
   para tomar las evidencias y eliminándolo de inmediato (sección 11) — es
   la optimización con más impacto, dado que el costo es por hora y no por
   uso.
2. Usando un solo `LoadBalancer` en vez de dos (solo `api-gateway`, dejando
   el `frontend` accesible a través del propio gateway o de un `Ingress`
   compartido en vez de un segundo ELB).
3. Reduciendo a un solo nodo si el mínimo de 2 nodos que pide la práctica
   no fuera un requisito — cada nodo adicional es costo fijo por hora
   independiente de si recibe carga.
4. Usando instancias Spot para el node group, que cuestan una fracción del
   precio on-demand (con el trade-off de que AWS puede recuperarlas con
   poco aviso — aceptable para una práctica, no para producción).
5. Aprovechando la capa gratuita/créditos educativos de AWS Educate en vez
   de facturación directa a la tarjeta del estudiante.

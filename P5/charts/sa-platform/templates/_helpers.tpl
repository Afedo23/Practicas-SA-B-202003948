{{/*
Practica 5 - Software Avanzado
_helpers.tpl del chart padre. Estos named templates viven en el namespace
de plantillas de TODO el release, por lo que tambien estan disponibles
dentro de cada subchart (api-gateway, auth-service, solicitudes-service,
aprobaciones-service, notificaciones-service, cronjobs) via `include`.
*/}}

{{/*
sa-platform.fullname
Nombre base compartido por todos los recursos de la plataforma.
Usa `default` para permitir sobreescritura por values y `required` para
garantizar que Release.Name nunca llegue vacio a un recurso de Kubernetes.
*/}}
{{- define "sa-platform.fullname" -}}
{{- required "Release.Name no puede estar vacio" .Release.Name | trunc 40 | trimSuffix "-" -}}
{{- end -}}

{{/*
sa-platform.labels
Set de labels comunes (recomendadas por Kubernetes) para cualquier recurso
de la plataforma. Recibe como contexto un dict con al menos "root" (el .
de nivel superior) y opcionalmente "component".
*/}}
{{- define "sa-platform.labels" -}}
app.kubernetes.io/part-of: sa-platform
app.kubernetes.io/managed-by: {{ .root.Release.Service | quote }}
app.kubernetes.io/instance: {{ .root.Release.Name | quote }}
helm.sh/chart: {{ printf "%s-%s" .root.Chart.Name .root.Chart.Version | quote }}
{{- if .component }}
app.kubernetes.io/component: {{ .component | quote }}
app.kubernetes.io/name: {{ .component | quote }}
{{- end }}
{{- end -}}

{{/*
sa-platform.selectorLabels
Subconjunto MINIMO e inmutable de labels usado como selector. Nunca debe
incluir valores que cambien entre upgrades (version, chart, etc.), o
Kubernetes rechazara el update del Deployment/selector.
*/}}
{{- define "sa-platform.selectorLabels" -}}
app.kubernetes.io/part-of: sa-platform
app.kubernetes.io/component: {{ required "component es requerido para el selector" .component | quote }}
{{- end -}}

{{/*
sa-platform.env
Construye la lista de variables de entorno NO sensibles de un microservicio
a partir de un map (.envMap). Demuestra el uso de `range` sobre un dict y
de `default` para valores opcionales.
*/}}
{{- define "sa-platform.env" -}}
{{- range $key, $value := .envMap }}
- name: {{ $key }}
  value: {{ default "" $value | quote }}
{{- end }}
{{- end -}}

{{/*
sa-platform.image
Arma el string "repository:tag" de una imagen. Usa `if/else` para decidir
si aplica un tag explicito o cae al appVersion del chart, y `quote` para
asegurar que el resultado siempre sea un string valido en el manifiesto.
*/}}
{{- define "sa-platform.image" -}}
{{- if .tag }}
{{- printf "%s:%s" .repository .tag -}}
{{- else }}
{{- printf "%s:%s" .repository .Chart.AppVersion -}}
{{- end }}
{{- end -}}

{{/*
sa-platform.appConfigData
Fuente UNICA de las variables no sensibles compartidas (host/puerto de BD y
broker, nivel de log, carne del estudiante). La usan tanto el ConfigMap del
chart padre como el checksum/config de cada Deployment/CronJob de los
subcharts (por eso vive aca y no en un values.yaml individual): un cambio
en cualquiera de estos valores debe disparar el mismo checksum en todos
lados y forzar el reinicio de los pods afectados.
*/}}
{{- define "sa-platform.appConfigData" -}}
DB_HOST: {{ default (printf "%s-postgresql" .Release.Name) .Values.global.database.hostOverride | quote }}
DB_PORT: {{ .Values.global.database.port | default "5432" | quote }}
BROKER_HOST: {{ default (printf "%s-rabbitmq" .Release.Name) .Values.global.broker.hostOverride | quote }}
BROKER_PORT: {{ .Values.global.broker.port | default "5672" | quote }}
LOG_LEVEL: {{ .Values.global.logLevel | default "info" | quote }}
CARNE: {{ required "global.estudianteCarne es requerido (numero de carne para los cronjobs)" .Values.global.estudianteCarne | quote }}
{{- end -}}

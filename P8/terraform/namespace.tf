# ------------------------------------------------------------------
# Namespace dedicado a la Practica 8. Nace y muere por Terraform --
# nunca se crea con "kubectl create namespace" a mano.
# ------------------------------------------------------------------
resource "kubernetes_namespace" "sa_p8" {
  metadata {
    name = var.namespace
    labels = {
      "app.kubernetes.io/part-of"    = "sa-platform"
      "app.kubernetes.io/managed-by" = "terraform"
      "practica"                     = "sa-p8"
    }
  }
}

# ------------------------------------------------------------------
# ResourceQuota: limite agregado de todo el namespace.
# Reemplaza al ResourceQuota que antes generaba el propio chart de Helm
# (templates/resourcequota.yaml) -- ese template ahora esta deshabilitado
# via values (resourceQuota.managedByHelm: false) para no duplicar/pelear
# por el mismo objeto con Terraform.
# ------------------------------------------------------------------
resource "kubernetes_resource_quota" "sa_p8" {
  metadata {
    name      = "sa-p8-quota"
    namespace = kubernetes_namespace.sa_p8.metadata[0].name
  }
  spec {
    hard = {
      "requests.cpu"    = var.resource_quota.requests_cpu
      "requests.memory" = var.resource_quota.requests_memory
      "limits.cpu"      = var.resource_quota.limits_cpu
      "limits.memory"   = var.resource_quota.limits_memory
      "pods"            = var.resource_quota.max_pods
    }
  }
}

# ------------------------------------------------------------------
# LimitRange: valores por defecto y topes por CONTENEDOR individual.
# Reemplaza a templates/limitrange.yaml del chart (misma razon que arriba).
# ------------------------------------------------------------------
resource "kubernetes_limit_range" "sa_p8" {
  metadata {
    name      = "sa-p8-limits"
    namespace = kubernetes_namespace.sa_p8.metadata[0].name
  }
  spec {
    limit {
      type = "Container"
      default = {
        cpu    = var.limit_range.default_cpu
        memory = var.limit_range.default_memory
      }
      default_request = {
        cpu    = var.limit_range.default_request_cpu
        memory = var.limit_range.default_request_memory
      }
      max = {
        cpu    = var.limit_range.max_cpu
        memory = var.limit_range.max_memory
      }
      min = {
        cpu    = var.limit_range.min_cpu
        memory = var.limit_range.min_memory
      }
    }
  }
}

variable "aws_region" {
  description = "Region de AWS donde vive el cluster EKS"
  type        = string
  default     = "us-east-2"
}

variable "cluster_name" {
  description = "Nombre del cluster EKS (creado con eksctl en la Practica 6)"
  type        = string
  default     = "sa-p6-cluster"
}

variable "namespace" {
  description = "Namespace de Kubernetes para la Practica 8"
  type        = string
  default     = "sa-p8"
}

variable "argocd_namespace" {
  description = "Namespace donde vive la instalacion de ArgoCD"
  type        = string
  default     = "argocd"
}

variable "resource_quota" {
  description = "Cuotas de recursos del namespace sa-p8"
  type = object({
    requests_cpu    = string
    requests_memory = string
    limits_cpu      = string
    limits_memory   = string
    max_pods        = string
  })
  default = {
    requests_cpu    = "4"
    requests_memory = "4Gi"
    limits_cpu      = "8"
    limits_memory   = "8Gi"
    max_pods        = "40"
  }
}

variable "limit_range" {
  description = "Limites por defecto/maximos/minimos por contenedor en sa-p8"
  type = object({
    default_cpu            = string
    default_memory         = string
    default_request_cpu    = string
    default_request_memory = string
    max_cpu                = string
    max_memory              = string
    min_cpu                 = string
    min_memory               = string
  })
  default = {
    default_cpu             = "250m"
    default_memory           = "256Mi"
    default_request_cpu      = "100m"
    default_request_memory   = "128Mi"
    max_cpu                  = "1"
    max_memory                = "1Gi"
    min_cpu                   = "50m"
    min_memory                 = "64Mi"
  }
}

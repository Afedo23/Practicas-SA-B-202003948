# ------------------------------------------------------------------
# RBAC de minimo privilegio para sa-p8.
#
# Historicamente (Practica 7) el pipeline de GitHub Actions tenia
# credenciales de AWS con permisos amplios sobre el cluster completo
# (rol IAM detras de aws-actions/configure-aws-credentials + helm
# upgrade directo). En esta practica ese problema se elimina de raiz:
# el pipeline de codigo YA NO tiene ningun kubeconfig ni credencial de
# cluster (ver .github/workflows/p8-cicd.yml). El UNICO componente que
# aplica cambios al cluster es el controlador de ArgoCD, y aqui se le
# otorga acceso via Role+RoleBinding LIMITADO al namespace sa-p8 -- no
# un ClusterRoleBinding de cluster-admin.
# ------------------------------------------------------------------

resource "kubernetes_role" "argocd_deployer" {
  metadata {
    name      = "argocd-deployer"
    namespace = kubernetes_namespace.sa_p8.metadata[0].name
  }
  rule {
    api_groups = ["", "apps", "batch", "networking.k8s.io", "argoproj.io"]
    resources  = ["*"]
    verbs      = ["*"]
  }
}

resource "kubernetes_role_binding" "argocd_deployer" {
  metadata {
    name      = "argocd-deployer-binding"
    namespace = kubernetes_namespace.sa_p8.metadata[0].name
  }
  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role.argocd_deployer.metadata[0].name
  }
  subject {
    kind      = "ServiceAccount"
    name      = "argocd-application-controller"
    namespace = var.argocd_namespace
  }
}

# ------------------------------------------------------------------
# ServiceAccount de solo lectura para automatizacion futura (ej. un
# check de estado desde CI) que NUNCA necesita poder desplegar nada.
# Demuestra separacion de privilegios: leer != escribir != administrar.
# ------------------------------------------------------------------
resource "kubernetes_service_account" "ci_readonly" {
  metadata {
    name      = "ci-readonly"
    namespace = kubernetes_namespace.sa_p8.metadata[0].name
  }
}

resource "kubernetes_role" "readonly" {
  metadata {
    name      = "sa-p8-readonly"
    namespace = kubernetes_namespace.sa_p8.metadata[0].name
  }
  rule {
    api_groups = ["", "apps", "batch", "argoproj.io"]
    resources  = ["pods", "deployments", "rollouts", "services", "jobs", "cronjobs"]
    verbs      = ["get", "list", "watch"]
  }
}

resource "kubernetes_role_binding" "ci_readonly" {
  metadata {
    name      = "ci-readonly-binding"
    namespace = kubernetes_namespace.sa_p8.metadata[0].name
  }
  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role.readonly.metadata[0].name
  }
  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.ci_readonly.metadata[0].name
    namespace = kubernetes_namespace.sa_p8.metadata[0].name
  }
}

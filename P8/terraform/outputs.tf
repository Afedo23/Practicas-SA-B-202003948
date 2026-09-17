output "namespace" {
  value = kubernetes_namespace.sa_p8.metadata[0].name
}

output "resource_quota_name" {
  value = kubernetes_resource_quota.sa_p8.metadata[0].name
}

output "limit_range_name" {
  value = kubernetes_limit_range.sa_p8.metadata[0].name
}

output "argocd_deployer_role" {
  value = kubernetes_role.argocd_deployer.metadata[0].name
}

output "ci_readonly_service_account" {
  value = kubernetes_service_account.ci_readonly.metadata[0].name
}

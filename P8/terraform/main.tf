terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.31"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Datos del cluster EKS ya existente (creado con eksctl en la Practica 6).
# Terraform NO crea el cluster -- solo administra recursos DENTRO de el
# (namespace, cuotas, limites, RBAC), que es lo que pide la rubrica.
data "aws_eks_cluster" "this" {
  name = var.cluster_name
}

data "aws_eks_cluster_auth" "this" {
  name = var.cluster_name
}

provider "kubernetes" {
  host                   = data.aws_eks_cluster.this.endpoint
  cluster_ca_certificate  = base64decode(data.aws_eks_cluster.this.certificate_authority[0].data)
  token                   = data.aws_eks_cluster_auth.this.token
}

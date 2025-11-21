# Magic Button - Terraform Infrastructure

terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
  
  # État distant dans GCS (optionnel, à activer après premier apply)
  # backend "gcs" {
  #   bucket = "your-terraform-state-bucket"
  #   prefix = "magic-button/terraform/state"
  # }
}

# Variables
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "europe-west1"
}

variable "vertex_location" {
  description = "Vertex AI Location"
  type        = string
  default     = "us-central1"
}

variable "service_name" {
  description = "Cloud Run service name"
  type        = string
  default     = "magic-button-api"
}

# Provider configuration
provider "google" {
  project = var.project_id
  region  = var.region
}

# Data sources
data "google_project" "project" {
  project_id = var.project_id
}

# Cloud Storage bucket for documents
resource "google_storage_bucket" "documents" {
  name     = "${var.project_id}-documents"
  location = var.region
  
  uniform_bucket_level_access = true
  
  versioning {
    enabled = true
  }
  
  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }
  
  labels = {
    project     = "magic-button"
    environment = "production"
  }
}

# Service Account for Cloud Run
resource "google_service_account" "api" {
  account_id   = "magic-button-api"
  display_name = "Magic Button API Service Account"
  description  = "Service account for Magic Button API on Cloud Run"
}

# IAM bindings for service account
resource "google_project_iam_member" "api_vertex_ai" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "api_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "api_storage" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "api_secrets" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.api.email}"
}

# Storage bucket IAM
resource "google_storage_bucket_iam_member" "api_bucket_admin" {
  bucket = google_storage_bucket.documents.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.api.email}"
}

# Secret Manager secret for HMAC
resource "google_secret_manager_secret" "hmac_secret" {
  secret_id = "hmac-secret"
  
  replication {
    auto {}
  }
  
  labels = {
    project = "magic-button"
    type    = "hmac-key"
  }
}

# Grant service account access to secret
resource "google_secret_manager_secret_iam_member" "hmac_secret_accessor" {
  secret_id = google_secret_manager_secret.hmac_secret.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api.email}"
}

# Cloud Run service (will be deployed via CI/CD or gcloud)
resource "google_cloud_run_service" "api" {
  name     = var.service_name
  location = var.region
  
  template {
    spec {
      service_account_name = google_service_account.api.email
      
      containers {
        image = "gcr.io/cloudrun/hello" # Placeholder, will be updated during deployment
        
        ports {
          container_port = 8080
        }
        
        env {
          name  = "PROJECT_ID"
          value = var.project_id
        }
        
        env {
          name  = "REGION"
          value = var.region
        }
        
        env {
          name  = "VERTEX_LOCATION"
          value = var.vertex_location
        }
        
        env {
          name  = "BUCKET_NAME"
          value = google_storage_bucket.documents.name
        }
        
        env {
          name = "HMAC_SECRET"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.hmac_secret.secret_id
              key  = "latest"
            }
          }
        }
        
        resources {
          limits = {
            cpu    = "1"
            memory = "2Gi"
          }
        }
      }
      
      timeout_seconds = 300
    }
    
    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale"      = "0"
        "autoscaling.knative.dev/maxScale"      = "10"
        "run.googleapis.com/execution-environment" = "gen2"
      }
    }
  }
  
  traffic {
    percent         = 100
    latest_revision = true
  }
  
  depends_on = [
    google_service_account.api,
    google_storage_bucket.documents
  ]
  
  lifecycle {
    ignore_changes = [
      template[0].spec[0].containers[0].image,
    ]
  }
}

# Allow public access to Cloud Run service
resource "google_cloud_run_service_iam_member" "public_access" {
  service  = google_cloud_run_service.api.name
  location = google_cloud_run_service.api.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Firestore database (created manually or via gcloud)
# Note: Terraform provider doesn't fully support Firestore database creation
# This is handled in the bootstrap script

# Outputs
output "cloud_run_url" {
  description = "URL of the Cloud Run service"
  value       = google_cloud_run_service.api.status[0].url
}

output "service_account_email" {
  description = "Email of the service account"
  value       = google_service_account.api.email
}

output "storage_bucket_name" {
  description = "Name of the storage bucket"
  value       = google_storage_bucket.documents.name
}

output "secret_name" {
  description = "Name of the HMAC secret"
  value       = google_secret_manager_secret.hmac_secret.secret_id
}

output "project_info" {
  description = "Project information"
  value = {
    project_id      = var.project_id
    region          = var.region
    vertex_location = var.vertex_location
    service_name    = var.service_name
  }
}
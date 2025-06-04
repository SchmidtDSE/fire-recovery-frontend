#!/bin/bash

# Set your project ID 
PROJECT_ID="dse-nps"
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

# Create a Workload Identity Pool
gcloud iam workload-identity-pools create "fire-recovery-pool" \
  --project="$PROJECT_ID" \
  --location="global" \
  --display-name="Fire Recovery GA Pool"

# Create a Workload Identity Provider with CORRECT attribute mapping AND condition
GITHUB_OWNER="schmidtdse"
REPO_NAME="fire-recovery-frontend"
REPO_PATH="${GITHUB_OWNER}/${REPO_NAME}"

gcloud iam workload-identity-pools providers create-oidc "github-actions-provider" \
  --project="$PROJECT_ID" \
  --location="global" \
  --workload-identity-pool="fire-recovery-pool" \
  --display-name="GitHub Actions Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-condition="attribute.repository==\"${REPO_PATH}\""

# Get the full Workload Identity Provider resource name
WORKLOAD_IDENTITY_PROVIDER=$(gcloud iam workload-identity-pools providers describe "github-actions-provider" \
  --project="$PROJECT_ID" \
  --location="global" \
  --workload-identity-pool="fire-recovery-pool" \
  --format="value(name)")

echo "Provider Resource Name: $WORKLOAD_IDENTITY_PROVIDER"

# Create or use an existing service account
SERVICE_ACCOUNT="github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com"

gcloud iam service-accounts add-iam-policy-binding "$SERVICE_ACCOUNT" \
  --project="$PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/fire-recovery-pool/attribute.repository/${REPO_PATH}"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/iam.serviceAccountTokenCreator"

echo "Setup complete! Use this Workload Identity Provider in your GitHub Actions workflow:"
echo "$WORKLOAD_IDENTITY_PROVIDER"
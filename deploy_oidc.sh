#!/bin/bash

# Set your project ID
PROJECT_ID="dse-nps"

# Create a Workload Identity Pool
gcloud iam workload-identity-pools create "fire-recovery-ga-pool" \
  --project="$PROJECT_ID" \
  --location="global" \
  --display-name="Fire Recovery GA Pool"

# Create a Workload Identity Provider with CORRECT attribute mapping AND condition
GITHUB_OWNER="schmidtdse"
REPO_NAME="fire-recovery-frontend"

gcloud iam workload-identity-pools providers create-oidc "github-actions-provider" \
  --project="$PROJECT_ID" \
  --location="global" \
  --workload-identity-pool="fire-recovery-ga-pool" \
  --display-name="GitHub Actions Provider" \
  --attribute-mapping="google.subject=assertion.sub" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-condition="attribute.repository==\"${GITHUB_OWNER}/${REPO_NAME}\""

# Get the full Workload Identity Provider resource name
WORKLOAD_IDENTITY_PROVIDER=$(gcloud iam workload-identity-pools providers describe "github-actions-provider" \
  --project="$PROJECT_ID" \
  --location="global" \
  --workload-identity-pool="fire-recovery-ga-pool" \
  --format="value(name)")

echo "Provider Resource Name: $WORKLOAD_IDENTITY_PROVIDER"

# Create or use an existing service account
SERVICE_ACCOUNT="github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com"

# Fix the IAM binding format - this is the corrected line
gcloud iam service-accounts add-iam-policy-binding "$SERVICE_ACCOUNT" \
  --project="$PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/113009620257/locations/global/workloadIdentityPools/fire-recovery-ga-pool/attribute.repository/${GITHUB_OWNER}/${REPO_NAME}"

echo "Setup complete! Use this Workload Identity Provider in your GitHub Actions workflow:"
echo "$WORKLOAD_IDENTITY_PROVIDER"
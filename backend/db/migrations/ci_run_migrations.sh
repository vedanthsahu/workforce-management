#!/usr/bin/env bash
# Runs on the bastion instance (has network access to RDS; GitHub's hosted
# runners do not). Invoked via `aws ssm send-command`, not run directly.
#
# Expects these env vars to already be set before this script runs:
#   MIGRATE_TARGET      - "dev" or "uat"
#   MIGRATOR_SECRET_ARN - ARN of the Secrets Manager secret holding this
#                         environment's migrator {"username":..,"password":..}
#   DB_HOST_REAL        - the actual RDS endpoint (not localhost -- no
#                         tunnel needed here, this host is already in the VPC)
#   WORKDIR             - where the migration files were synced to (via
#                         `aws s3 sync` from the CI workflow, done before
#                         this command is sent)
set -euo pipefail

cd "$WORKDIR"

python3 -m pip install --quiet -r requirements.txt

SECRET_JSON=$(aws secretsmanager get-secret-value --secret-id "$MIGRATOR_SECRET_ARN" --query SecretString --output text)
MIGRATOR_USER=$(echo "$SECRET_JSON" | python3 -c 'import json,sys,urllib.parse; print(urllib.parse.quote_plus(json.load(sys.stdin)["username"]))')
MIGRATOR_PASSWORD=$(echo "$SECRET_JSON" | python3 -c 'import json,sys,urllib.parse; print(urllib.parse.quote_plus(json.load(sys.stdin)["password"]))')

export REAL_MIGRATIONS_DATABASE_URL="postgresql+psycopg2://${MIGRATOR_USER}:${MIGRATOR_PASSWORD}@${DB_HOST_REAL}:5432/seatbooking_${MIGRATE_TARGET}?sslmode=require"

echo "Current revision before upgrade:"
python3 -m alembic current

echo "Applying pending migrations..."
python3 -m alembic upgrade head

echo "Current revision after upgrade:"
python3 -m alembic current

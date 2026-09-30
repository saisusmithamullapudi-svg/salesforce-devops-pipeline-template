# Configuring the pipeline for your org

1. Create a Connected App (or External Client App) with **JWT Bearer Flow** enabled and upload the certificate from `openssl req -x509 -newkey rsa:2048 -keyout server.key -out server.crt -days 365 -nodes`.
2. Pre-authorize a dedicated integration user (profile/permission set with *Modify Metadata* only as needed).
3. In GitHub → Settings → Environments create `uat` and `production`:
   - Variables: `SF_USERNAME`, `SF_INSTANCE_URL` (and repository-level `SF_UAT_USERNAME`, `SF_UAT_INSTANCE_URL` for PR validation)
   - Secrets: `SF_JWT_CLIENT_ID`, `SF_JWT_KEY` (`base64 -w0 server.key`)
   - On `production`, add **Required reviewers**.
4. Delete the local `server.key` after upload. It must never be committed (`.gitignore` blocks `*.key`).

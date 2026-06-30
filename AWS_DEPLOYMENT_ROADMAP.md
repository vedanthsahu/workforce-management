# Workforce Management — AWS Deployment Roadmap

## Table of Contents
1. [Service Overview](#1-service-overview)
2. [Current State](#2-current-state)
3. [Phase 1: Containerize Application](#phase-1-containerize-your-application-day-1-2)
4. [Phase 2: AWS Infrastructure Setup](#phase-2-set-up-aws-infrastructure-day-3-5)
5. [Phase 3: CI/CD Pipeline](#phase-3-set-up-cicd-pipeline-day-6-8)
6. [Phase 4: Infrastructure as Code](#phase-4-infrastructure-as-code-day-9-11)
7. [Phase 5: Production Readiness](#phase-5-production-readiness-day-12-15)
8. [Complete Pipeline Flow](#the-complete-pipeline-flow)
9. [Files Needed](#files-you-need-in-your-repo)
10. [Cost Estimate](#cost-estimate)

---

## 1. Service Overview

| Service | Full Name | What It Actually Does | Your App's Context |
|---------|-----------|----------------------|-------------------|
| **ECR** | Amazon Elastic Container Registry | A private Docker image storage. Like a private Docker Hub but on AWS. You push your built images here. | Stores your FastAPI and Next.js Docker images after every build |
| **CodePipeline** | AWS CodePipeline | The orchestrator. It doesn't build or deploy anything itself — it just connects the stages and says "run Stage 1, when done run Stage 2, when done run Stage 3." | Watches GitHub for pushes, triggers build, waits, triggers deploy |
| **CodeBuild** | AWS CodeBuild | The build worker. It gets a temporary machine, runs your commands (install, test, docker build, docker push), and shuts down. You pay only for build minutes. | Runs pytest, npm run build, creates Docker images, pushes to ECR |
| **CodeDeploy** | AWS CodeDeploy | The deployment engine. It manages HOW the new version replaces the old one — Blue/Green traffic shifting, health checks, automatic rollback. | Spins up new containers, checks health, switches traffic, kills old containers |
| **ECS** | Amazon Elastic Container Service | The container runtime. It runs your Docker containers on AWS. You tell it "run 2 copies of this image with this CPU/memory" and it keeps them running. | Runs your FastAPI backend and Next.js frontend as containers |
| **Fargate** | AWS Fargate | The server management layer under ECS. Instead of you managing EC2 servers, Fargate provisions and manages the underlying servers automatically. | You never SSH into a server. Fargate handles the machines. |
| **ALB** | Application Load Balancer | Traffic router. Sits in front of your containers and distributes requests. Routes `/api/*` to backend containers and `/*` to frontend containers. | Single entry point for your app. Handles HTTPS, health checks, routing. |
| **RDS** | Amazon Relational Database Service | Managed PostgreSQL. You already have this. AWS handles backups, patching, failover. | Your existing PostgreSQL database — no change needed |
| **Secrets Manager** | AWS Secrets Manager | Secure storage for passwords and keys. Your containers read secrets at startup instead of hardcoding them. | Database password, JWT secret, API keys — not in your code or env files |
| **CloudWatch** | Amazon CloudWatch | Monitoring and logging. Every container's stdout/stderr goes here. You set alarms that trigger when something breaks. | View backend logs, frontend errors, set alarm on high error rate |
| **CDK** | AWS Cloud Development Kit | Infrastructure as Code. You write TypeScript code that describes all the above services. One command creates everything. | Defines your entire AWS setup in code — repeatable, version controlled |

---

## 2. Current State

**Already have:**
- GitHub repository with frontend + backend code
- Amazon Relational Database Service (RDS) PostgreSQL (already running)
- Application code (Next.js + FastAPI)

**Need to create:**
- Dockerfiles (frontend + backend)
- Amazon Elastic Container Registry repositories
- Amazon Elastic Container Service (ECS) Fargate cluster + services
- Application Load Balancer
- CI/CD pipeline
- Infrastructure as Code (CDK)

---

## Phase 1: Containerize Your Application (Day 1-2)

**Goal:** Make your app run inside Docker containers locally

### Tasks:
1. Create `backend/Dockerfile`
   - Python 3.11 + pip install + uvicorn
2. Create `frontend/Dockerfile`
   - Node 20 + npm install + npm run build + standalone server
3. Create `docker-compose.yml` (for local development)
   - Backend + Frontend + PostgreSQL (local)
4. Test locally
   - `docker compose up` → verify app works at localhost

**Deliverable:** App runs in containers on your laptop

---

## Phase 2: Set Up AWS Infrastructure (Day 3-5)

**Goal:** Create the AWS resources to run your containers

### 2.1 Amazon Elastic Container Registry (ECR)
- Create repository: `wfm-backend`
- Create repository: `wfm-frontend`

### 2.2 Networking
- Amazon Virtual Private Cloud (VPC) with public + private subnets (or use your existing VPC where RDS sits)
- Security Group for Application Load Balancer (allow ports 80, 443)
- Security Group for ECS tasks (allow traffic from ALB only)
- Security Group for RDS (allow traffic from ECS tasks only)

### 2.3 Application Load Balancer (ALB)
- Listener: HTTPS (port 443)
- Target Group: `wfm-backend` (port 8000, health check: `/health`)
- Target Group: `wfm-frontend` (port 3000, health check: `/`)
- Rule: `/api/*` → backend target group
- Rule: `/*` → frontend target group

### 2.4 Amazon Elastic Container Service (ECS)
- **Cluster:** `wfm-cluster`
- **Task Definition: wfm-backend**
  - Image: from ECR
  - CPU: 512, Memory: 1024
  - Port: 8000
  - Environment: DATABASE_URL (from Secrets Manager)
- **Task Definition: wfm-frontend**
  - Image: from ECR
  - CPU: 256, Memory: 512
  - Port: 3000
  - Environment: NEXT_PUBLIC_API_URL
- **Service:** `wfm-backend-svc` (desired count: 2)
- **Service:** `wfm-frontend-svc` (desired count: 2)

### 2.5 AWS Secrets Manager
- Secret: `wfm/database-url`
- Secret: `wfm/jwt-secret`
- Secret: `wfm/any-api-keys`

### 2.6 Connect ECS to Existing Amazon RDS
- Update RDS security group to allow traffic from ECS security group

**Deliverable:** App runs on AWS, accessible via ALB URL

---

## Phase 3: Set Up CI/CD Pipeline (Day 6-8)

**Goal:** Automate build and deployment on every git push

### 3.1 AWS Identity and Access Management (IAM) Roles
- **CodePipeline service role** — access S3, trigger CodeBuild, trigger CodeDeploy
- **CodeBuild service role** — push to ECR, read secrets, write logs
- **CodeDeploy service role** — update ECS, manage ALB target groups

### 3.2 AWS CodeBuild Project
- Name: `wfm-build`
- Source: GitHub
- Environment: Ubuntu, Standard 7.0, Privileged (for Docker)
- Buildspec: use `buildspec.yml` from repo

### 3.3 AWS CodeDeploy
**Application:** `wfm-app`

**Deployment Group: wfm-backend-deploy**
- Compute platform: Amazon Elastic Container Service (ECS)
- ECS cluster: `wfm-cluster`
- ECS service: `wfm-backend-svc`
- Load balancer: ALB + target groups
- Strategy: Blue/Green (all at once after health check)
- Rollback: Automatic on Amazon CloudWatch alarm

**Deployment Group: wfm-frontend-deploy**
- Same setup for frontend service

### 3.4 AWS CodePipeline
- **Name:** `wfm-pipeline`
- **Stage 1: Source** → GitHub (your repo, main branch)
- **Stage 2: Build** → AWS CodeBuild project (`wfm-build`)
- **Stage 3: Approval** → Manual approval (via Amazon Simple Notification Service)
- **Stage 4: Deploy** → AWS CodeDeploy (Blue/Green to ECS)

### 3.5 Create Pipeline Config Files
- `buildspec.yml` — CodeBuild instructions
- `appspec-backend.yaml` — CodeDeploy backend config
- `appspec-frontend.yaml` — CodeDeploy frontend config

**Deliverable:** Push to main → auto build → approve → deployed

---

## Phase 4: Infrastructure as Code (Day 9-11)

**Goal:** Define everything above in code so it's repeatable

### Tasks:
1. Initialize CDK project
   ```
   mkdir infra && cd infra && npx cdk init --language typescript
   ```
2. Create CDK stacks
   - `NetworkStack` — VPC, subnets, security groups
   - `DatabaseStack` — reference existing RDS
   - `ContainerStack` — ECR, ECS cluster, task definitions, services, ALB
   - `PipelineStack` — CodePipeline, CodeBuild, CodeDeploy
3. Test
   - `cdk synth` → generates CloudFormation (verify)
   - `cdk deploy --all` → creates/updates everything

**Deliverable:** One command recreates your entire infrastructure

---

## Phase 5: Production Readiness (Day 12-15)

**Goal:** Ready to sell to customers

### 5.1 Custom Domain
- Amazon Route 53 → `your-product.com`
- AWS Certificate Manager → free HTTPS certificate
- Amazon CloudFront → CDN for static assets

### 5.2 Monitoring and Alerts
- Amazon CloudWatch Dashboard (CPU, memory, request count, error rate)
- Alarms: High error rate → Amazon SNS → email/Slack
- Alarms: High CPU → trigger auto scaling
- CodeDeploy rollback alarm (rollback if error rate spikes after deploy)

### 5.3 Auto Scaling
- Backend: scale 2→6 tasks based on CPU > 70%
- Frontend: scale 2→4 tasks based on request count

### 5.4 Database
- Enable Multi-AZ on Amazon RDS (automatic failover)
- Enable automated backups (7-day retention)
- Enable Amazon RDS Performance Insights

### 5.5 Security
- AWS Web Application Firewall (WAF) on ALB
- Enable AWS CloudTrail (audit log of all AWS API calls)
- Enable Amazon GuardDuty (threat detection)

**Deliverable:** Production-grade, secure, monitored, auto-scaling

---

## The Complete Pipeline Flow

```
DEVELOPER                          AWS CLOUD

git push to main ──────────────> AWS CodePipeline (detects push)
                                       |
                                       v
                                 AWS CodeBuild (temporary build machine)
                                       |
                                  Run tests
                                  pytest + npm build
                                       |
                                  tests pass
                                       v
                                  docker build
                                  backend image
                                  frontend image
                                       |
                                       v
                                 Amazon ECR (images stored)
                                 - wfm-backend:a3f7bc2
                                 - wfm-frontend:a3f7bc2
                                       |
                                       v
                                 Manual Approval
                                 (team reviews, clicks approve)
                                       |
                                       v
                                 AWS CodeDeploy (Blue/Green)
                                       |
                                  Start GREEN environment
                                  (new containers with new image)
                                       |
                                       v
                                 Application Load Balancer
                                 health checks GREEN pass
                                       |
                                       v
                                 Switch traffic
                                 BLUE (old) -> GREEN (new)
                                       |
                                       v
                                 Amazon CloudWatch
                                 monitoring for errors
                                       |
                                  Errors detected?
                                  NO  -> Done! Old containers removed.
                                  YES -> Auto rollback to BLUE (old)
```

---

## Files You Need in Your Repo

```
Workforce_Management/
├── backend/
│   ├── Dockerfile                    <- NEW
│   └── ...existing code...
├── frontend/
│   ├── Dockerfile                    <- NEW
│   └── ...existing code...
├── buildspec.yml                     <- NEW (CodeBuild instructions)
├── appspec-backend.yaml              <- NEW (CodeDeploy config)
├── appspec-frontend.yaml             <- NEW (CodeDeploy config)
├── taskdef-backend.json              <- NEW (ECS task definition)
├── taskdef-frontend.json             <- NEW (ECS task definition)
├── docker-compose.yml                <- NEW (local development)
└── infra/                            <- NEW (CDK project)
    ├── bin/app.ts
    ├── lib/
    │   ├── network-stack.ts
    │   ├── container-stack.ts
    │   └── pipeline-stack.ts
    ├── cdk.json
    └── package.json
```

---

## Cost Estimate

| Service | Monthly Cost |
|---------|-------------|
| Amazon ECS on AWS Fargate (4 tasks: 2 backend + 2 frontend) | ~$120 |
| Amazon RDS PostgreSQL (db.t3.small, Multi-AZ) | ~$60 |
| Application Load Balancer | ~$16 |
| Amazon Elastic Container Registry | ~$2 |
| Amazon CloudFront | ~$5-20 |
| AWS CodePipeline + AWS CodeBuild | ~$5 |
| AWS Secrets Manager | ~$2 |
| Amazon CloudWatch | ~$5 |
| **Total** | **~$215-230/month** |

---

*Document generated for Workforce Management — AWS Deployment Planning*

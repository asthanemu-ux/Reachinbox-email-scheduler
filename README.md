# ReachInbox Email Scheduler

A full-stack email scheduling application that allows users to schedule, manage and monitor email campaigns using persistent background jobs, configurable rate limits and multiple SMTP sender accounts.

## Features

- Google OAuth authentication and logout.
- User-specific dashboard and email campaigns.
- Manual recipient entry and CSV upload.
- Configurable email scheduling date and time.
- Configurable worker concurrency.
- Minimum delay between emails from the same sender.
- Atomic Redis-based hourly rate limiting.
- Automatic rescheduling when hourly limits are reached.
- Multiple Ethereal SMTP sender accounts.
- Encrypted SMTP credentials.
- Scheduled and sent email dashboards.
- Email status filtering and search.
- Automatic dashboard refresh.
- Persistent PostgreSQL storage.
- Startup recovery of pending and queued emails.
- Duplicate-job protection using unique email IDs.
- Administrator-protected Bull Board queue monitoring.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS, Lucide React |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| Job Scheduling | BullMQ |
| Queue Storage | Redis |
| Email Service | Nodemailer, Ethereal SMTP |
| Authentication | Google OAuth 2.0, Passport.js |
| Queue Monitoring | Bull Board |
| Encryption | AES-256-GCM |

## System Architecture

```text
React Frontend
      |
      v
Express REST API ---- Google OAuth
      |
      v
PostgreSQL Database
      |
      v
BullMQ + Redis
      |
      v
Email Worker
      |
      +-- Sender locking
      +-- Minimum sending delay
      +-- Hourly rate limiting
      |
      v
Nodemailer / Ethereal SMTP
      |
      v
Delivery status updated in PostgreSQL
```

## Scheduling Workflow

1. The user logs in using Google.
2. SMTP sender accounts are provisioned for the user.
3. The user creates an email campaign.
4. Campaign and email records are saved in PostgreSQL.
5. Individual email jobs are added to BullMQ.
6. Workers process jobs according to their scheduled times.
7. Sender locks, minimum delays and hourly limits are checked before sending.
8. Emails exceeding hourly limits are rescheduled for the next hourly window.
9. Nodemailer sends emails through Ethereal SMTP.
10. Delivery statuses are updated in PostgreSQL and displayed on the dashboard.

## Project Structure

```text
reachinbox-scheduler/
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       └── types/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── db/
│   ├── middleware/
│   ├── queues/
│   ├── routes/
│   ├── scripts/
│   ├── services/
│   ├── types/
│   ├── utils/
│   ├── workers/
│   └── index.ts
├── .env.example
├── .gitignore
├── schema.sql
├── package.json
├── tsconfig.json
└── README.md
```

## Local Setup

### Prerequisites

- Node.js 22 or compatible version
- npm
- PostgreSQL
- Redis
- Google Cloud OAuth credentials

### 1. Install Backend Dependencies

```bash
npm ci
```

### 2. Configure Environment Variables

Create a `.env` file using `.env.example` as a template.

Configure the PostgreSQL connection, Redis connection, Google OAuth credentials, session secret and administrator email.

Generate an SMTP encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Generate a separate session secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Keep all credentials private. The actual `.env` file must not be committed to Git.

The optional test IDs are only required for legacy testing scripts.

### 3. Configure PostgreSQL

Create a database named `reachinbox`.

Import the provided database schema using PostgreSQL's psql client:

```bash
psql -h localhost -U postgres -d reachinbox -f schema.sql
```

The schema contains database structures without application records.

### 4. Start Redis

For Ubuntu or Windows WSL:

```bash
sudo service redis-server start
redis-cli ping
```

Expected response:

```text
PONG
```

For improved queue persistence, configure Redis with:

```text
appendonly yes
appendfsync everysec
maxmemory-policy noeviction
```

### 5. Configure Google OAuth

Create a Web Application OAuth client in Google Cloud Console.

Authorized JavaScript origin:

```text
http://localhost:5173
```

Authorized redirect URI:

```text
http://localhost:5000/api/auth/google/callback
```

Add the client ID and client secret to `.env`.

If the OAuth application is in testing mode, add the intended Google accounts as test users.

### 6. Start Backend

```bash
npm run dev
```

Backend URL:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/health
```

### 7. Start Frontend

Open a separate terminal:

```bash
cd frontend
npm ci
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | /health | Backend health check |
| GET | /api/auth/google | Google OAuth login |
| GET | /api/auth/google/callback | OAuth callback |
| GET | /api/auth/me | Current authenticated user |
| POST | /api/auth/logout | Logout |
| POST | /api/emails/schedule | Schedule email campaign |
| GET | /api/emails/scheduled | Retrieve scheduled emails |
| GET | /api/emails/sent | Retrieve sent and failed emails |
| GET | /api/emails/senders | Retrieve active sender accounts |
| GET | /admin/queues | Administrator queue monitoring |

## Rate Limiting and Concurrency

The application uses configurable BullMQ worker concurrency.

Redis Lua scripts atomically reserve hourly sending slots for sender accounts and campaigns. This prevents concurrent workers from independently exceeding configured hourly limits.

PostgreSQL advisory locks prevent simultaneous processing for the same sender. The last completed sending attempt is recorded to enforce the minimum sending delay.

When an hourly limit is reached, affected jobs are moved back into the delayed queue rather than discarded.

## Persistence and Recovery

PostgreSQL stores email records and delivery statuses, while Redis stores BullMQ jobs.

During backend startup, the recovery service checks pending and queued email records and recreates missing queue jobs where appropriate.

Unique email IDs are used as BullMQ job IDs to reduce duplicate processing. Database status checks provide additional protection against resending completed emails.

Emails interrupted during SMTP delivery require reconciliation because SMTP cannot guarantee exactly-once delivery.

## Queue Monitoring

Bull Board is available at:

```text
http://localhost:5000/admin/queues
```

Access is restricted to the configured administrator.

The monitoring dashboard displays waiting, active, delayed, completed and failed jobs.

## Testing

The following workflows were manually tested during development:

- Google login and logout.
- Multiple SMTP sender accounts.
- Manual email scheduling.
- CSV-based recipient scheduling.
- Email delivery through Ethereal.
- Minimum sending delay.
- Hourly rate limiting and delayed rescheduling.
- Queue persistence across backend restarts.
- Dashboard status updates.
- Bull Board monitoring.
- Frontend and backend production builds.

## Build Commands

Backend:

```bash
npm run build
```

Frontend:

```bash
cd frontend
npm run build
```

## Current Limitations and Future Improvements

- Slack OAuth and hourly-limit notifications are not yet implemented. The database includes a provision for Slack integration.
- Elasticsearch indexing and synchronization are not implemented. Dashboard search currently uses client-side filtering.
- Ethereal SMTP is a testing service and does not deliver emails to real recipient inboxes.
- Hourly limits use fixed UTC hourly windows and count reserved sending attempts.
- Email processing order is best-effort under concurrent execution and rescheduling.
- Interrupted SMTP deliveries require manual reconciliation.
- Database-to-queue recovery currently runs during backend startup.
- Duplicate-job protection is implemented, but repeated campaign submission is not fully request-idempotent.

## Conclusion

ReachInbox Email Scheduler demonstrates persistent background job scheduling, asynchronous email processing, concurrent workers, atomic rate limiting, OAuth authentication and real-time dashboard updates through periodic polling.
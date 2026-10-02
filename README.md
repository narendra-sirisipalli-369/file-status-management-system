# INS DEGA File Status Management System (FSMS)

![Military Grade UI](https://img.shields.io/badge/UX-High--Integrity-navy)
![Stack](https://img.shields.io/badge/Next.js-14-black)
![Database](https://img.shields.io/badge/PostgreSQL-raw%20SQL-blue)
![Deployment](https://img.shields.io/badge/Air--Gap-Ready-gold)

A professional-grade, high-security file management and tracking system designed for the **Indian Navy (INS Dega)**. This application transforms physical file workflows into a secure, digital tracking pipeline with a focus on authority, precision, and mission-critical legibility.

## ⚓ Key Features

### 1. Senior UI/UX Overhaul
- **High-Integrity Aesthetics**: Developed with a professional Navy Blue, Gold, and White palette.
- **Spatial Depth**: Implemented a transition from flat designs to a multi-layered elevation system with **Glassmorphism** (backdrop-blur) for a premium feel.
- **Technical Typography**: Utilizes optimized technical font weights and letter-spacing for maximum technical legibility.

### 2. Secure Tracking & QR Engine
- **IND-CV Tracking ID**: Generates cryptographically secure, unguessable tracking IDs for every file: `[Ref]-IND-CV-[YYYYMMDD]-[HEX]`.
- **Dynamic QR Generation**: Automatic QR code creation for physical file folders, enabling instant movement tracking.

### 3. Role-Based Access Control (RBAC)
Two roles, enforced at both the application layer and the database (partial unique indexes):
- **ADMIN (exactly one)**: Full system control — user management, master data (Departments, Stages, Procurement Modes, Authorities, Head Codes), Stage Manager configuration, file entry, and stage in/out movement.
- **KIOSK (one per department)**: View-only, department-scoped file search and QR tracking.

### 4. Stage Manager
Admin-configured workflow: for a given Procurement Mode + Authority + Head Code combination, the admin picks which of the 30+ master Stages apply and in what order. New files automatically get that stage list — no manual stage selection at file-entry time. Entering/exiting a stage is an audit-only action; it never itself drives which stage a file is "at" (`FileRecord.currentStageId` is the single source of truth for that).

### 5. Self-Service Kiosk
- Isolated public-facing portal for personnel to check file status.
- Department-scoped kiosk login, one dedicated kiosk account per department.
- **Anti-Enumeration Search**: Secure API that prevents unauthorized data harvesting.

### 6. Analytics & Dashboard
- **Instrument Metrics**: Professional gauges showing pipeline distribution and departmental load.
- **Live Activity Feed**: Timeline-based visualization of recent file movements.

---

## 🛠️ Technical Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL — plain `pg` (node-postgres), no ORM. Hand-written SQL migrations in `sql/migrations/`, applied by `scripts/migrate.js`.
- **Styling**: Vanilla CSS (Senior-level design system with zero external CDNs for air-gap compliance)
- **Security**: Jose (JWT) based authentication with middleware enforcement

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or higher
- npm or yarn
- PostgreSQL 14+ (local install, Docker, or a hosted instance)

### Installation
1. Clone the repository locally.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a Postgres database for local development:
   ```bash
   createdb fsms_dev
   ```
4. Create a local `.env` file (example):
   ```bash
   DATABASE_URL="postgresql://localhost:5432/fsms_dev"
   JWT_SECRET="replace-with-a-strong-random-secret"
   NEXTAUTH_URL="http://localhost:3000"
   NEXT_PUBLIC_BASE_URL="http://localhost:3000"
   ```
5. Apply migrations and seed the database:
   ```bash
   npm run migrate
   npm run seed
   ```
6. Start the development server:
   ```bash
   npm run dev
   ```

### Deployment (Air-Gapped)
The system is built to be **self-contained** save for the PostgreSQL server it connects to.
1. Create production env file (start from `.env.production.example`).
2. Run a production build: `npm run build`
3. Apply migrations: `npm run migrate`
4. Start the production server: `npm run start`

Seeded credentials are defined in `scripts/seed.ts` (e.g. `admin` / `admin123`; each department gets its own kiosk account, e.g. `kiosk` / `kiosk123` for Logistics).

---

**Designed for High-Integrity Environments.**
*Eastern Naval Command | Indian Navy*


For MAC installation and Running:
# 1) Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2) Install Node.js LTS (includes npm) and PostgreSQL
brew install node@20 postgresql@16
echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc
brew services start postgresql@16
source ~/.zshrc

# 3) Verify
node -v
npm -v
psql --version

# 4) In this project folder, install dependencies
cd /path/to/your/file-management/project
npm install

# 5) Create the database, apply migrations, seed
createdb fsms_dev
npm run migrate
npm run seed

# 6) Start app
npm run dev

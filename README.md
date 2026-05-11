# INS DEGA File Status Management System (FSMS)

![Military Grade UI](https://img.shields.io/badge/UX-High--Integrity-navy)
![Stack](https://img.shields.io/badge/Next.js-14-black)
![Database](https://img.shields.io/badge/SQLite-Prisma-blue)
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
Strict 4-tier security architecture:
- **B_LOGO (Super Admin)**: Full system control and user management.
- **D_LOGO / MCPO (Admin)**: Verification, reporting, and high-level remarks.
- **INWARD (Operator)**: Primary file entry and status management.
- **PERSONNEL (Mailman)**: High-speed scan interface for "Received/Submitted" movement events.

### 4. Self-Service Kiosk
- Isolated public-facing portal for personnel to check file status.
- **Triple-Factor Verification**: Requires Reference Number + Submission Date + Registered Mobile Number.
- **Anti-Enumeration Search**: Secure API that prevents unauthorized data harvesting.

### 5. Analytics & Dashboard
- **Instrument Metrics**: Professional gauges showing pipeline distribution and departmental load.
- **Live Activity Feed**: Timeline-based visualization of recent file movements.

---

## 🛠️ Technical Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: SQLite with Prisma ORM
- **Styling**: Vanilla CSS (Senior-level design system with zero external CDNs for air-gap compliance)
- **Security**: Jose (JWT) based authentication with middleware enforcement

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or higher
- npm or yarn

### Installation
1. Clone the repository locally.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a local `.env` file (example):
   ```bash
   DATABASE_URL="file:./dev.db"
   JWT_SECRET="replace-with-a-strong-random-secret"
   NEXTAUTH_URL="http://localhost:3000"
   NEXT_PUBLIC_BASE_URL="http://localhost:3000"
   ```

   > Note: SQLite paths are resolved relative to `prisma/schema.prisma`, so `file:./dev.db` points to `prisma/dev.db`.

4. Initialize the database and run seeds:
   ```bash
   npx prisma generate
   npx prisma db push
   npm run seed
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

### Deployment (Air-Gapped)
The system is built to be **100% self-contained**.
1. Create production env file (start from `.env.production.example`).
2. Run a production build: `npm run build`
3. Start the production server: `npm run start`

### Docker
Run a production container using SQLite (no external database required):
```bash
docker compose up --build
```

Seeded credentials are defined in `prisma/seed.ts` (e.g. `admin` / `admin123`, `kiosk` / `kiosk123`).

---

**Designed for High-Integrity Environments.**
*Eastern Naval Command | Indian Navy*


For MAC installation and Running:
# 1) Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2) Install Node.js LTS (includes npm)
brew install node@20
echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# 3) Verify
node -v
npm -v

# 4) In this project folder, install dependencies (includes Prisma CLI via devDependencies)
cd /path/to/your/file-management/project
npm install

# 5) Prisma setup for this codebase
npx prisma generate
npx prisma db push
npm run seed

# 6) Start app
npm run dev

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateSecureTrackingId } from '../src/lib/trackingId';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with default users...');

  // Hash password helper
  const hash = (pw: string) => bcrypt.hash(pw, 10);

  // ── DEFAULT USERS (all 9 roles per FSMS_Report.pdf) ─────────────────────────
  const users = [
    { username: 'b_logo',       password: await hash('blogo123'),    role: 'B_LOGO',           department: 'Logistics' },
    { username: 'd_logo',       password: await hash('dlogo123'),    role: 'D_LOGO',           department: 'Logistics' },
    { username: 'mcpo',         password: await hash('mcpo123'),     role: 'MCPO',             department: 'Logistics' },
    { username: 'inward_op',    password: await hash('inward123'),   role: 'INWARD',           department: 'Logistics' },
    { username: 'mailman_int',  password: await hash('mailman123'),  role: 'MAILMAN_INTERNAL', department: 'Logistics' },
    { username: 'mailman_ext',  password: await hash('mailman123'),  role: 'MAILMAN_EXTERNAL', department: 'Logistics' },
    { username: 'store_office', password: await hash('store123'),    role: 'STORE_OFFICE',     department: 'Logistics' },
    { username: 'ifa_user',     password: await hash('ifa123'),      role: 'IFA',              department: 'Logistics' },
    { username: 'co_sir',       password: await hash('cosir123'),    role: 'CO_SIR',           department: 'Logistics' },
    // Shared department kiosk logins (End User per PDF spec)
    { username: 'logistics',    password: await hash('logistics123'),role: 'KIOSK_USER',       department: 'Logistics' },
    { username: 'inas321',      password: await hash('inas321'),     role: 'KIOSK_USER',       department: 'INAS 321' },
    { username: 'inas324',      password: await hash('inas324'),     role: 'KIOSK_USER',       department: 'INAS 324' },
    { username: 'inas551',      password: await hash('inas551'),     role: 'KIOSK_USER',       department: 'INAS 551' },
    { username: 'ro_dept',      password: await hash('ro123'),       role: 'KIOSK_USER',       department: 'RO' },
    { username: 'inas333',      password: await hash('inas333'),     role: 'KIOSK_USER',       department: 'INAS 333' },
    { username: 'ald_dept',     password: await hash('ald123'),      role: 'KIOSK_USER',       department: 'ALD' },
    { username: 'blo_dept',     password: await hash('blo123'),      role: 'KIOSK_USER',       department: 'BLO' },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where:  { username: u.username },
      update: { password: u.password, role: u.role, department: u.department },
      create: u,
    });
    console.log(`  [OK] User seeded: ${u.username} (${u.role})`);
  }

  // ── SAMPLE FILE RECORDS ───────────────────────────────────────────────────
  const sampleFiles = [
    {
      smsRefNo:       'SMS/LOG/201',
      description:    'Supply and Installation of Humidity Controllers for Aircraft Hangar',
      proposalValue:  1100000,
      head:           'GEM/800(E)',
      department:     'Logistics',
      typeProcessing: 'GEM',
      mobileNumber:   '9876543210',
      status:         'Inward',
      initStage:      'Inward',
      initRemark:     'File received and registered in the system.',
    },
    {
      smsRefNo:       'SMS/LOG/202',
      description:    'Procurement of Aircraft Towing Vehicle Tyres',
      proposalValue:  550000,
      head:           'Flash',
      department:     'INAS 321',
      typeProcessing: 'Manual',
      mobileNumber:   '9123456789',
      status:         'D Logo',
      initStage:      'D Logo',
      initRemark:     'File forwarded to D Logo for review.',
    },
  ];

  for (const f of sampleFiles) {
    const secureTrackingId = generateSecureTrackingId(f.smsRefNo);
    const existing = await prisma.fileRecord.findUnique({ where: { smsRefNo: f.smsRefNo } });
    if (!existing) {
      const record = await prisma.fileRecord.create({
        data: {
          smsRefNo:         f.smsRefNo,
          secureTrackingId,
          description:      f.description,
          proposalValue:    f.proposalValue,
          head:             f.head,
          department:       f.department,
          typeProcessing:   f.typeProcessing,
          mobileNumber:     f.mobileNumber,
          status:           f.status,
          dateSubmission:   new Date(),
        },
      });
      await prisma.statusHistory.create({
        data: {
          fileRecordId: record.id,
          stageName:    f.initStage,
          inspectionBy: 'Inward User',
          remarks:      f.initRemark,
        },
      });
      console.log(`  [OK] Sample file created: ${f.smsRefNo}`);
    } else {
      console.log(`  [SKIP] File already exists: ${f.smsRefNo}`);
    }
  }

  console.log('Seed complete.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

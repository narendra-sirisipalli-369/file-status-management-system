// Standalone seed script — plain `pg`, no Next.js path aliases (mirrors how
// migrate.js runs: `ts-node` outside the Next.js module resolver).
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import { generateSecureTrackingId } from '../src/lib/trackingId'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// Dummy master data — 32 departments / 32 stages (1 stage per department),
// standing in for the real FSMS list until that's provided.
const DEPARTMENTS: { name: string; code: string }[] = [
  { name: 'Logistics', code: 'LOG' },
  { name: 'INAS 321', code: 'INAS321' },
  { name: 'INAS 324', code: 'INAS324' },
  { name: 'INAS 551', code: 'INAS551' },
  { name: 'RO', code: 'RO' },
  { name: 'INAS 333', code: 'INAS333' },
  { name: 'ALD', code: 'ALD' },
  { name: 'BLO', code: 'BLO' },
  { name: 'Accounts', code: 'ACCT' },
  { name: 'Finance', code: 'FIN' },
  { name: 'Technical', code: 'TECH' },
  { name: 'Legal', code: 'LEGAL' },
  { name: 'Purchase', code: 'PUR' },
  { name: 'Store', code: 'STORE' },
  { name: 'Tender', code: 'TENDER' },
  { name: 'Audit', code: 'AUDIT' },
  { name: 'Commissioner', code: 'COMM' },
  { name: 'Director', code: 'DIR' },
  { name: 'Administration', code: 'ADMN' },
  { name: 'Vigilance', code: 'VIG' },
  { name: 'IT Cell', code: 'ITCELL' },
  { name: 'HR', code: 'HR' },
  { name: 'Estate', code: 'ESTATE' },
  { name: 'Transport', code: 'TRANS' },
  { name: 'Security', code: 'SEC' },
  { name: 'Medical', code: 'MED' },
  { name: 'Canteen', code: 'CANT' },
  { name: 'Welfare', code: 'WELF' },
  { name: 'Training', code: 'TRNG' },
  { name: 'Personnel', code: 'PERS' },
  { name: 'Civil Works', code: 'CIVIL' },
  { name: 'Records', code: 'REC' },
]

const PROCUREMENT_MODES = ['GFR 154', 'GFR 155', 'GEM Comparision', 'GEM Bidding']
const AUTHORITIES = [
  'sqn CO',
  'sqn CO with IFA',
  'CO DEGA',
  'CO DEGA With IFA',
  'C LOGO',
  'C LOGO With IFA',
  'COS',
  'COS with IFA',
  'COS (P & A)',
  'CSO(P & A)',
  'CSO (P & A) WIth IFA',
  'C-in-C',
  'C-in-C with IFA',
]
const REMARKS_BY = ['CEO', 'Director', 'Logistics', 'Accounts', 'Technical']
const HEAD_CODES: { code: string; name: string }[] = [
  { code: '800(A)', name: '800(A)' },
  { code: '800(R)', name: '800(R)' },
  { code: '110(R)', name: '110(R)' },
]

async function main() {
  console.log('Seeding database...')

  // ── Departments ──────────────────────────────────────────────────────
  const departmentIds: Record<string, string> = {}
  for (const d of DEPARTMENTS) {
    const { rows } = await pool.query(
      `INSERT INTO departments (name, code) VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE SET code = EXCLUDED.code
       RETURNING id`,
      [d.name, d.code]
    )
    departmentIds[d.name] = rows[0].id
  }
  console.log(`  [OK] ${DEPARTMENTS.length} departments seeded`)

  // ── Stages (one per department, name only — in/out alternated for demo) ──
  const stageIds: Record<string, string> = {}
  let stageIndex = 0
  for (const d of DEPARTMENTS) {
    const stageType = stageIndex % 2 === 0 ? 'IN' : 'OUT'
    stageIndex++
    const { rows } = await pool.query(
      `INSERT INTO stages (name, stage_type) VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE SET stage_type = EXCLUDED.stage_type
       RETURNING id`,
      [d.name, stageType]
    )
    stageIds[d.name] = rows[0].id
  }
  console.log(`  [OK] ${DEPARTMENTS.length} stages seeded`)

  // ── Users: 1 ADMIN + 32 KIOSK (one per department) ──────────────────
  const hash = (pw: string) => bcrypt.hash(pw, 10)

  await pool.query(
    `INSERT INTO users (username, password, role, department_id) VALUES ($1, $2, 'ADMIN', NULL)
     ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password`,
    ['admin', await hash('admin123')]
  )
  console.log('  [OK] admin (ADMIN) seeded')

  const kioskUsernames: Record<string, string> = {
    Logistics: 'kiosk',
    'INAS 321': 'inas321',
    'INAS 324': 'inas324',
    'INAS 551': 'inas551',
    RO: 'ro_dept',
    'INAS 333': 'inas333',
    ALD: 'ald_dept',
    BLO: 'blo_dept',
  }
  let kioskIndex = 1
  for (const d of DEPARTMENTS) {
    const username = kioskUsernames[d.name] ?? d.code.toLowerCase()
    const mobileNumber = `90000${String(kioskIndex++).padStart(5, '0')}`
    await pool.query(
      `INSERT INTO users (username, password, role, department_id, mobile_number) VALUES ($1, $2, 'KIOSK', $3, $4)
       ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, department_id = EXCLUDED.department_id, mobile_number = EXCLUDED.mobile_number`,
      [username, await hash('kiosk123'), departmentIds[d.name], mobileNumber]
    )
  }
  console.log(`  [OK] ${DEPARTMENTS.length} kiosk users seeded (one per department)`)

  // ── Extensible lookups ────────────────────────────────────────────────
  const procurementModeIds: Record<string, string> = {}
  for (const name of PROCUREMENT_MODES) {
    const { rows } = await pool.query(
      `INSERT INTO procurement_modes (name, is_system_defined) VALUES ($1, true)
       ON CONFLICT (name) DO UPDATE SET is_system_defined = true RETURNING id`,
      [name]
    )
    procurementModeIds[name] = rows[0].id
  }

  const authorityIds: Record<string, string> = {}
  for (const name of AUTHORITIES) {
    const { rows } = await pool.query(
      `INSERT INTO authorities (name, is_system_defined) VALUES ($1, true)
       ON CONFLICT (name) DO UPDATE SET is_system_defined = true RETURNING id`,
      [name]
    )
    authorityIds[name] = rows[0].id
  }

  const headCodeIds: Record<string, string> = {}
  for (const hc of HEAD_CODES) {
    const { rows } = await pool.query(
      `INSERT INTO head_codes (code, name, is_system_defined) VALUES ($1, $2, true)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, is_system_defined = true RETURNING id`,
      [hc.code, hc.name]
    )
    headCodeIds[hc.code] = rows[0].id
  }

  for (const name of REMARKS_BY) {
    await pool.query(
      `INSERT INTO remarks_by (name, is_system_defined) VALUES ($1, true)
       ON CONFLICT (name) DO UPDATE SET is_system_defined = true`,
      [name]
    )
  }
  console.log('  [OK] procurement modes, authorities, head codes, remarks by seeded')

  // ── Stage Manager configs ───────────────────────────────────────────
  async function seedStageManager(
    name: string,
    procurementMode: string,
    authority: string,
    headCode: string,
    stageNames: string[]
  ) {
    const existing = await pool.query(
      `SELECT id FROM stage_managers WHERE procurement_mode_id = $1 AND authority_id = $2 AND head_code_id = $3`,
      [procurementModeIds[procurementMode], authorityIds[authority], headCodeIds[headCode]]
    )
    if (existing.rows.length > 0) {
      console.log(`  [SKIP] Stage Manager already exists: ${name}`)
      return existing.rows[0].id as string
    }
    const { rows } = await pool.query(
      `INSERT INTO stage_managers (procurement_mode_id, authority_id, head_code_id)
       VALUES ($1, $2, $3) RETURNING id`,
      [procurementModeIds[procurementMode], authorityIds[authority], headCodeIds[headCode]]
    )
    const stageManagerId = rows[0].id as string
    let order = 1
    for (const stageName of stageNames) {
      await pool.query(
        `INSERT INTO stage_manager_stages (stage_manager_id, stage_id, sequence_order) VALUES ($1, $2, $3)`,
        [stageManagerId, stageIds[stageName], order++]
      )
    }
    console.log(`  [OK] Stage Manager seeded: ${name} (${stageNames.length} stages)`)
    return stageManagerId
  }

  const gfr154CoDega800A = await seedStageManager(
    'GFR 154 / CO DEGA / 800(A)',
    'GFR 154',
    'CO DEGA',
    '800(A)',
    ['Accounts', 'Finance', 'Technical', 'Purchase', 'Store']
  )
  await seedStageManager('GFR 155 / sqn CO with IFA / 800(R)', 'GFR 155', 'sqn CO with IFA', '800(R)', [
    'Accounts',
    'Legal',
    'Finance',
    'Store',
  ])
  await seedStageManager('GEM Bidding / COS / 110(R)', 'GEM Bidding', 'COS', '110(R)', [
    'Accounts',
    'Technical',
    'Tender',
    'Purchase',
    'Audit',
    'Store',
  ])

  // ── Sample file records ─────────────────────────────────────────────
  const adminId = (await pool.query(`SELECT id FROM users WHERE username = 'admin'`)).rows[0].id

  async function seedSampleFile(smsRefNo: string, description: string, proposalValue: number, departmentName: string, stageManagerId: string) {
    const existing = await pool.query('SELECT id FROM file_records WHERE sms_ref_no = $1', [smsRefNo])
    if (existing.rows.length > 0) {
      console.log(`  [SKIP] File already exists: ${smsRefNo}`)
      return
    }
    const secureTrackingId = generateSecureTrackingId(smsRefNo)
    const stageRows = await pool.query(
      'SELECT stage_id FROM stage_manager_stages WHERE stage_manager_id = $1 ORDER BY sequence_order ASC',
      [stageManagerId]
    )
    const firstStageId = stageRows.rows[0].stage_id

    const fileRow = await pool.query(
      `INSERT INTO file_records (
         secure_tracking_id, sms_ref_no, description, proposal_value,
         procurement_mode_id, authority_id, minor_head_id, stage_manager_id,
         department_id, created_by_id, current_stage_id
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [
        secureTrackingId,
        smsRefNo,
        description,
        proposalValue,
        procurementModeIds['GFR 154'],
        authorityIds['CO DEGA'],
        headCodeIds['800(A)'],
        stageManagerId,
        departmentIds[departmentName],
        adminId,
        firstStageId,
      ]
    )
    const fileRecordId = fileRow.rows[0].id

    for (const row of stageRows.rows) {
      await pool.query('INSERT INTO file_stages (file_record_id, stage_id, sequence_order) VALUES ($1, $2, $3)', [
        fileRecordId,
        row.stage_id,
        stageRows.rows.indexOf(row) + 1,
      ])
    }

    await pool.query(
      `INSERT INTO status_history (file_record_id, stage_id, action, remarks, actor_user_id)
       VALUES ($1, $2, 'CREATED', NULL, $3)`,
      [fileRecordId, firstStageId, adminId]
    )
    console.log(`  [OK] Sample file created: ${smsRefNo}`)
  }

  await seedSampleFile(
    'SMS/LOG/201',
    'Supply and Installation of Humidity Controllers for Aircraft Hangar',
    1100000,
    'Logistics',
    gfr154CoDega800A
  )
  await seedSampleFile(
    'SMS/LOG/202',
    'Procurement of Aircraft Towing Vehicle Tyres',
    550000,
    'INAS 321',
    gfr154CoDega800A
  )

  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => pool.end())

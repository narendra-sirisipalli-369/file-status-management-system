#!/usr/bin/env python3
"""Replace FSMS master lookup data with a fresh dataset.

This script deletes existing lookup data for:
- stage_manager_stages
- stage_managers
- stages
- head_codes
- authorities
- procurement_modes
- departments

Then it inserts the values defined below.

If your database still has file records, stage history, or file stages that reference
old lookups, run with CLEAR_FILE_DATA=1 to wipe those tables too.
"""

import os
import sys

try:
    import psycopg2
    from psycopg2.extras import execute_batch
except ImportError as exc:
    raise SystemExit(
        'psycopg2 is required. Install it with: pip install psycopg2-binary'
    ) from exc

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise SystemExit('Missing DATABASE_URL environment variable.')

CLEAR_FILE_DATA = os.getenv('CLEAR_FILE_DATA', 'false').lower() in ('1', 'true', 'yes')

# TODO: Replace the values below with your real production master data.
NEW_DEPARTMENTS = [
    {'name': '321 (V) Flight', 'code': '321 (V) Flight'},
    {'name': '333(PHG)', 'code': '333(PHG)'},
    {'name': 'AED', 'code': 'AED'},
    {'name': 'ATC', 'code': 'ATC'},
    {'name': 'BLD', 'code': 'BLD'},
    {'name': 'CAPT TECH', 'code': 'CAPT TECH'},
    {'name': 'DEGA VIHAR', 'code': 'DEGA VIHAR'},
    {'name': 'DOG SQUAD', 'code': 'DOG SQUAD'},
    {'name': 'DSC', 'code': 'DSC'},
    {'name': 'EXO', 'code': 'EXO'},
    {'name': 'FIRE-STATION', 'code': 'FIRE-STATION'},
    {'name': 'GUNNERY', 'code': 'GUNNERY'},
    {'name': 'HAWK SIMULATOR', 'code': 'HAWK SIMULATOR'},
    {'name': 'INAS 311', 'code': 'INAS 311'},
    {'name': 'INAS 324', 'code': 'INAS 324'},
    {'name': 'INAS 333', 'code': 'INAS 333'},
    {'name': 'INAS 350', 'code': 'INAS 350'},
    {'name': 'INAS 551', 'code': 'INAS 551'},
    {'name': 'IT', 'code': 'IT'},
    {'name': 'LAKSHYA', 'code': 'LAKSHYA'},
    {'name': 'LOGISTICS', 'code': 'LOGISTICS'},
    {'name': 'MET', 'code': 'MET'},
    {'name': 'MI ROOM', 'code': 'MI ROOM'},
    {'name': 'MIG 29K', 'code': 'MIG 29K'},
    {'name': 'MSO', 'code': 'MSO'},
    {'name': 'MT SECTION', 'code': 'MT SECTION'},
    {'name': 'NISC', 'code': 'NISC'},
    {'name': 'OPS ROOM', 'code': 'OPS ROOM'},
    {'name': 'PHOTO', 'code': 'PHOTO'},
    {'name': 'RO', 'code': 'RO'},
    {'name': 'SE & SO', 'code': 'SE & SO'},
    {'name': 'SFSO', 'code': 'SFSO'},
    {'name': 'SPORTS', 'code': 'SPORTS'},
    {'name': 'WORKS', 'code': 'WORKS'} 

    # Add your real department names + codes here.
]

NEW_PROCUREMENT_MODES = [
    'GFR 154',
    'GFR 155',
    'GEM Comparision',
    'GEM Bidding',
    # Add your real procurement modes here.
]

NEW_AUTHORITIES = [
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
    # Add your real authorities here.
]

NEW_HEAD_CODES = [
    {'code': '800(A)', 'name': '800(A)'},
    {'code': '800(R)', 'name': '800(R)'},
    {'code': '110(R)', 'name': '110(R)'},
    # Add your real major/minor head codes here.
]

NEW_STAGES = [
    {'name': 'FOR AIP', 'stage_type': 'IN'},
    {'name': 'AIP RETURNED WITH REMARKS', 'stage_type': 'IN'},
    {'name': 'DRAFT BID', 'stage_type': 'IN'},
    {'name': 'HO DRAFT BID SIGN', 'stage_type': 'IN'},
    {'name': 'FOR IFA AIP', 'stage_type': 'IN'},
    {'name': 'ONLINE AON', 'stage_type': 'IN'},
    {'name': 'HO FOR AON CLEARANCE FROM IFA', 'stage_type': 'IN'},
    {'name': 'BID PUBLISHING', 'stage_type': 'IN'},
    {'name': 'BID PUBLISHED', 'stage_type': 'IN'},
    {'name': 'TEC BID OPENING', 'stage_type': 'IN'},
    {'name': 'HO FOR TEC AND FC OPEN APPROVAL', 'stage_type': 'IN'},
    {'name': 'FC OPEN / RA/ L1 AND DRAFT SANCTION', 'stage_type': 'IN'},
    {'name': 'FOR IFA FC APPROVAL', 'stage_type': 'IN'},
    {'name': 'Online FC', 'stage_type': 'IN'},
    {'name': 'HO for FC clearance from IFA', 'stage_type': 'IN'},
    {'name': 'FOR ORIGINAL SANCTION', 'stage_type': 'IN'},
    {'name': 'SANCTION IS AWAITING FOR CO SIGN', 'stage_type': 'IN'},
    {'name': 'HO TO DEPT FOR GFR SIGN', 'stage_type': 'IN'},
    {'name': 'WORK/ SUPPLY ORDER SIGN OR GEM CONTRACT', 'stage_type': 'IN'},
    {'name': 'HO TO DEPT FOR CRV, INVOICE & LEDGER ACTION', 'stage_type': 'IN'},
    {'name': 'CRAC / SDAC', 'stage_type': 'IN'},
    {'name': 'FOR CB PUNCH', 'stage_type': 'IN'},
    {'name': 'HO TO DEPT FOR CB SIGN', 'stage_type': 'IN'},
    {'name': 'CB SIGN BY LOGO', 'stage_type': 'IN'},
    {'name': 'HO TO NS FOR CDA', 'stage_type': 'IN'},
    {'name': 'CFL / RESUBMISSION', 'stage_type': 'IN'},
    {'name': 'CDA', 'stage_type': 'IN'},
    {'name': 'SQUADRON OUT (FOR SANCTION)', 'stage_type': 'IN'},
    {'name': 'HIGHER CFA', 'stage_type': 'IN'},
    {'name': 'CB Forwarding to SQDN', 'stage_type': 'IN'},


    # Add your real stage names and IN/OUT direction here.
]


def delete_existing_master_data(cur):
    if CLEAR_FILE_DATA:
        print('Clearing file-level data: status_history, file_stages, file_records')
        cur.execute('DELETE FROM status_history')
        cur.execute('DELETE FROM file_stages')
        cur.execute('DELETE FROM file_records')

    print('Deleting KIOSK users so departments can be replaced...')
    cur.execute("DELETE FROM users WHERE role = 'KIOSK'")

    print('Deleting stage_manager_stages and stage_managers...')
    cur.execute('DELETE FROM stage_manager_stages')
    cur.execute('DELETE FROM stage_managers')

    print('Deleting stages...')
    cur.execute('DELETE FROM stages')

    print('Deleting head_codes, authorities, procurement_modes, departments...')
    cur.execute('DELETE FROM head_codes')
    cur.execute('DELETE FROM authorities')
    cur.execute('DELETE FROM procurement_modes')
    cur.execute('DELETE FROM departments')


def insert_master_data(cur):
    print(f'Inserting {len(NEW_DEPARTMENTS)} departments...')
    execute_batch(
        cur,
        'INSERT INTO departments (name, code, is_active) VALUES (%s, %s, true)',
        [(d['name'], d['code']) for d in NEW_DEPARTMENTS],
    )

    print(f'Inserting {len(NEW_PROCUREMENT_MODES)} procurement modes...')
    execute_batch(
        cur,
        'INSERT INTO procurement_modes (name, is_system_defined, is_active) VALUES (%s, true, true)',
        [(name,) for name in NEW_PROCUREMENT_MODES],
    )

    print(f'Inserting {len(NEW_AUTHORITIES)} authorities...')
    execute_batch(
        cur,
        'INSERT INTO authorities (name, is_system_defined, is_active) VALUES (%s, true, true)',
        [(name,) for name in NEW_AUTHORITIES],
    )

    print(f'Inserting {len(NEW_HEAD_CODES)} head codes...')
    execute_batch(
        cur,
        'INSERT INTO head_codes (code, name, is_system_defined, is_active) VALUES (%s, %s, true, true)',
        [(hc['code'], hc['name']) for hc in NEW_HEAD_CODES],
    )

    print(f'Inserting {len(NEW_STAGES)} stages...')
    execute_batch(
        cur,
        'INSERT INTO stages (name, stage_type, is_active) VALUES (%s, %s, true)',
        [(stage['name'], stage.get('stage_type', 'IN')) for stage in NEW_STAGES],
    )


def main():
    print('Connecting to database...')
    with psycopg2.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            if not CLEAR_FILE_DATA:
                cur.execute('SELECT count(*) FROM file_records')
                file_count = cur.fetchone()[0]
                if file_count > 0:
                    raise SystemExit(
                        'Database contains file records. Set CLEAR_FILE_DATA=1 to also remove file data '
                        'before replacing master lookup data.'
                    )

            print('Beginning master data replacement transaction...')
            delete_existing_master_data(cur)
            insert_master_data(cur)
            conn.commit()
            print('Master data replacement completed successfully.')


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print('ERROR:', exc, file=sys.stderr)
        sys.exit(1)

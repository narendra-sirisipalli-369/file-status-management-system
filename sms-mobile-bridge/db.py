import os

import pandas as pd
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432"),
    "dbname": os.getenv("DB_NAME", "sms_sender_test"),
    "user": os.getenv("DB_USER", os.getenv("USER", "postgres")),
    "password": os.getenv("DB_PASSWORD", ""),
}

COLUMNS = ["id", "phone_number", "message", "message_count"]


def get_connection():
    return psycopg2.connect(**DB_CONFIG)


def init_db():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS sms_contacts (
                    id SERIAL PRIMARY KEY,
                    phone_number VARCHAR(20) NOT NULL,
                    message TEXT NOT NULL,
                    message_count INTEGER NOT NULL DEFAULT 1 CHECK (message_count > 0),
                    created_at TIMESTAMP NOT NULL DEFAULT now(),
                    updated_at TIMESTAMP NOT NULL DEFAULT now()
                )
                """
            )
        conn.commit()


def fetch_contacts() -> pd.DataFrame:
    with get_connection() as conn:
        df = pd.read_sql(
            "SELECT id, phone_number, message, message_count FROM sms_contacts ORDER BY id",
            conn,
        )
    return df


def insert_contact(phone_number: str, message: str, message_count: int) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO sms_contacts (phone_number, message, message_count)
                VALUES (%s, %s, %s)
                """,
                (phone_number, message, message_count),
            )
        conn.commit()


def update_contact(contact_id: int, phone_number: str, message: str, message_count: int) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE sms_contacts
                SET phone_number = %s, message = %s, message_count = %s, updated_at = now()
                WHERE id = %s
                """,
                (phone_number, message, message_count, contact_id),
            )
        conn.commit()


def delete_contacts(contact_ids: list[int]) -> None:
    if not contact_ids:
        return
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM sms_contacts WHERE id = ANY(%s)",
                (contact_ids,),
            )
        conn.commit()

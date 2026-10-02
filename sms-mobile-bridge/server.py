from fastapi import FastAPI, HTTPException
import psycopg2
from pydantic import BaseModel
from typing import List, Optional
import datetime

app = FastAPI(title="FSMS Mobile Bridge (High Reliability)")

# Database configuration - matches DATABASE_URL in ../.env (postgresql://localhost:5432/fsms_dev)
DB_CONFIG = {
    "dbname": "fsms_dev",
    "host": "localhost"
}

class SmsItem(BaseModel):
    id: str
    phone: str
    message: str
    remarks: Optional[str] = None
    file_record_id: Optional[str] = None

@app.get("/api/sms-queue", response_model=List[SmsItem])
def get_sms_queue():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        # Fetch PENDING messages, limited to 5 for high reliability
        query = """
            SELECT id, recipient, message, remarks, file_record_id
            FROM sms_queue
            WHERE status = 'PENDING'
            ORDER BY created_at
            LIMIT 5
        """
        cur.execute(query)
        rows = cur.fetchall()

        results = []
        for row in rows:
            results.append(SmsItem(
                id=str(row[0]),
                phone=row[1],
                message=row[2],
                remarks=row[3],
                file_record_id=str(row[4]) if row[4] else None
            ))

        cur.close()
        conn.close()
        return results
    except Exception as e:
        print(f"Error fetching queue: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sms-queue/{message_id}/mark-sent")
def mark_sent(message_id: str):
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        # 1. Get file_record_id before updating status
        cur.execute("SELECT file_record_id, recipient FROM sms_queue WHERE id = %s", (message_id,))
        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Message not found")

        file_record_id, recipient = row

        # 2. Update status in sms_queue
        cur.execute("UPDATE sms_queue SET status = 'SENT', sent_at = NOW() WHERE id = %s", (message_id,))

        # 3. Add entry to status_history for audit log
        if file_record_id:
            history_query = """
                INSERT INTO status_history (file_record_id, action, remarks, timestamp)
                VALUES (%s, 'ADVANCED', %s, NOW())
            """
            log_msg = f"SMS Sent to {recipient}"
            cur.execute(history_query, (file_record_id, log_msg))

        conn.commit()
        cur.close()
        conn.close()
        print(f"✅ CONFIRMED: SMS sent and logged for ID {message_id}")
        return {"success": True}
    except Exception as e:
        print(f"❌ ERROR marking sent: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

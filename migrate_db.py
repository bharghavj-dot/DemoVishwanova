import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load the environment variables from your .env file
load_dotenv()
DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    print("Error: DATABASE_URL not found in .env")
    exit(1)

# Handle Render's postgres:// vs postgresql:// quirk if needed
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

print(f"Connecting to database...")
engine = create_engine(DATABASE_URL)

alter_statements = [
    # Add phone_number to User
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);",
    
    # Add voice fields to sessions
    "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS call_sid VARCHAR(50);",
    "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS call_transcript JSON;",
    "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS voice_analysis JSON;",
    "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS voice_status VARCHAR(20) DEFAULT 'none';",
    
    # Add voice fields to reports
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS call_transcript JSON;",
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS voice_analysis JSON;"
]

# Execute the statements safely
try:
    with engine.begin() as connection:
        for stmt in alter_statements:
            connection.execute(text(stmt))
            print(f"Executed: {stmt}")
    print("\n✅ Database migration successful! All new voice columns added.")
except Exception as e:
    print(f"\n❌ Error migrating database: {e}")

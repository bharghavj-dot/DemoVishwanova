import sys
from pathlib import Path

_ROOT = str(Path(__file__).resolve().parent)
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from backend.database import SessionLocal
from backend.models.db_models import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

db = SessionLocal()
try:
    user = User(
        id="USR-KRISH1234",
        full_name="Krish Demo",
        email="krishdemo14@gmail.com",
        password_hash=pwd_context.hash("demo123"),
        role="patient"
    )
    db.add(user)
    db.commit()
    print("Successfully added krishdemo14@gmail.com to database!")
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()

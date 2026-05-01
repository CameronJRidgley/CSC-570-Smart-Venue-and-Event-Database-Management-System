"""Create all backend tables directly from SQLModel metadata."""
from sqlmodel import SQLModel
from app.db.sql import engine
from app.models.sql import *  # noqa: F401,F403

print("Creating all tables...")
SQLModel.metadata.create_all(engine)
print("Done.")

# List tables
from sqlalchemy import inspect
insp = inspect(engine)
tables = insp.get_table_names()
print(f"\nTables now in DB ({len(tables)}):")
for t in sorted(tables):
    print(f"  {t}")

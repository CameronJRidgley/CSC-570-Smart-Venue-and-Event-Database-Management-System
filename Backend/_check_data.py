import psycopg
conn = psycopg.connect(host='localhost', dbname='570SQL', user='postgres', password='Dstphiagn@1')
cur = conn.cursor()
for t in ['venue', 'event', 'attendee', 'ticket', 'staff']:
    cur.execute(f'SELECT COUNT(*) FROM "{t}"')
    print(f"{t}: {cur.fetchone()[0]} rows")

# show event schema
cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='event'")
print("\nEvent columns:")
for col in cur.fetchall():
    print(f"  {col[0]}: {col[1]}")
conn.close()

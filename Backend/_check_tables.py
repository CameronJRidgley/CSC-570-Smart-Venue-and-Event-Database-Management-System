import psycopg
conn = psycopg.connect(host='localhost', dbname='570SQL', user='postgres', password='Dstphiagn@1')
cur = conn.cursor()
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
tables = [r[0] for r in cur.fetchall()]
print(f"Tables ({len(tables)}):", tables)
conn.close()

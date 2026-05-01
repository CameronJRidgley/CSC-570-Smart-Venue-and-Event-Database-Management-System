import psycopg
conn = psycopg.connect(host='localhost', dbname='570SQL', user='postgres', password='Dstphiagn@1')
conn.autocommit = True
cur = conn.cursor()
# Drop the team tables (different schema from backend)
team_tables = ['vendor_sale', 'staff_vendor_assignment', 'incident', 'ticket', 'payment', 'attendee', 'seat', 'event', 'staff', 'vendor', 'venue']
for t in team_tables:
    cur.execute(f'DROP TABLE IF EXISTS "{t}" CASCADE')
    print(f"Dropped {t}")
conn.close()
print("Done.")

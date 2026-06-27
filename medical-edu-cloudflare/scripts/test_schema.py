#!/usr/bin/env python3
"""Validate the SQLite schema by executing it on an in-memory database."""
import sqlite3
import sys

SCHEMA_PATH = '/home/z/my-project/src/db/schema.sql'

def main():
    with open(SCHEMA_PATH, 'r') as f:
        schema = f.read()

    try:
        conn = sqlite3.connect(':memory:')
        conn.executescript(schema)
        # check tables
        tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall()
        print('✓ Schema executed successfully')
        print(f'✓ Tables created: {len(tables)}')
        for t in tables:
            print(f'  - {t[0]}')
        # check indexes
        indexes = conn.execute("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name").fetchall()
        print(f'✓ Indexes: {len(indexes)}')
        # check triggers
        triggers = conn.execute("SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name").fetchall()
        print(f'✓ Triggers: {len(triggers)}')
        for t in triggers:
            print(f'  - {t[0]}')

        # test some operations
        conn.execute("INSERT INTO users(username, password_hash) VALUES('test', 'hash')")
        uid = conn.execute("SELECT id FROM users WHERE username='test'").fetchone()[0]
        conn.execute("INSERT INTO projects(user_id, title) VALUES(?, 'Test Project')", (uid,))
        pid = conn.execute("SELECT id FROM projects WHERE title='Test Project'").fetchone()[0]
        conn.execute("INSERT INTO topics(project_id, user_id, title) VALUES(?, ?, 'Test Topic')", (pid, uid))
        tid = conn.execute("SELECT id FROM topics WHERE title='Test Topic'").fetchone()[0]
        conn.execute("INSERT INTO flashcards(user_id, front, back) VALUES(?, 'Q?', 'A!')", (uid,))
        print('✓ CRUD operations work')
        print('✓ FTS table populated:', conn.execute("SELECT COUNT(*) FROM topics_fts").fetchone()[0], 'rows')

        conn.close()
        print('\n✅ Schema validation passed!')
    except Exception as e:
        print(f'❌ Error: {e}', file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

import { users } from '../src/db/schema';
import { newId } from '../src/db/ids';
import { createTestDb } from './db';

describe('createTestDb', () => {
  it('returns a migrated, empty database on every call', async () => {
    const first = await createTestDb();
    await first.db
      .insert(users)
      .values({ id: newId(), authSubject: 's', email: 'a@example.com', name: 'A' });
    expect(await first.db.select().from(users)).toHaveLength(1);
    await first.close();

    const second = await createTestDb();
    expect(await second.db.select().from(users)).toHaveLength(0);
    await second.close();
  }, 30_000);
});

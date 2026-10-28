import { createPool, onPoolError } from './db.module';

const URL = 'postgres://user:s3cret-pw@db.example.com:5432/app';

describe('pg pool error handling', () => {
  it('logs idle-client errors with name and message only', () => {
    const warn = jest.fn();
    const err = Object.assign(new Error('terminating connection due to administrator command'), { name: 'DatabaseError' });
    expect(() => onPoolError({ warn })(err)).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(1);
    const line = warn.mock.calls[0][0] as string;
    expect(line).toContain('DatabaseError');
    expect(line).toContain('terminating connection due to administrator command');
    expect(line).not.toContain('\n');
  });

  it('createPool registers a listener so an emitted error does not crash the process', async () => {
    const warn = jest.fn();
    const pool = createPool(URL, { warn });
    try {
      expect(() => pool.emit('error', new Error(`connection to ${URL} lost`))).not.toThrow();
      expect(warn).toHaveBeenCalledTimes(1);
      expect(pool.listenerCount('error')).toBe(1);
    } finally {
      await pool.end();
    }
  });
});

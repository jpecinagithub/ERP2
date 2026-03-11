const request = require('supertest');
const app = require('../src');

describe('Journal', () => {
  let token;
  beforeAll(async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'admin' });
    token = res.body.token;
  });

  it('should create a balanced journal entry', async () => {
    const payload = {
      date: '2025-01-15',
      description: 'Test journal entry',
      lines: [
        { account_id: 1, debit: 100, credit: 0, description: 'Debe' },
        { account_id: 2, debit: 0, credit: 100, description: 'Haber' }
      ]
    }
    const res = await request(app).post('/api/journal')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('journalEntryId');
    expect(res.body).toHaveProperty('balanced', true);
  });
});

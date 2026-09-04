const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeEmail } = require('../controllers/authController');

test('normalizeEmail trims whitespace and lowercases the email', () => {
  assert.equal(normalizeEmail('  User@Example.COM  '), 'user@example.com');
});

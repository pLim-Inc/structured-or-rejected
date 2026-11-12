'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { addBusinessDays, statusDueDate } = require('../srv/lib/deadline');

test('EINV-04 paid Thursday 28 October 2027, status due Thursday 4 November', () => {
  // Fri 29 = day 1, weekend skipped, Mon 1 Nov is a national holiday, Tue 2 = day 2, Wed 3 = day 3, Thu 4 = day 4
  assert.equal(statusDueDate('2027-10-28', ['2027-11-01']), '2027-11-04');
});

test('without the holiday the same payment is due a day earlier', () => {
  assert.equal(statusDueDate('2027-10-28'), '2027-11-03');
});

test('a holiday in the middle of the week is skipped', () => {
  // Paid Fri 8 Oct 2027: Mon 11 = 1, Tue 12 holiday, Wed 13 = 2, Thu 14 = 3, Fri 15 = 4
  assert.equal(addBusinessDays('2027-10-08', 4, ['2027-10-12']), '2027-10-15');
});

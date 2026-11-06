'use strict';
// POST /api/results/logout — Clear the session cookie. Flow and rules: api/_lib/results.js
const { endpoint, actions } = require('../_lib/results');
module.exports = endpoint('logout', actions.logout);

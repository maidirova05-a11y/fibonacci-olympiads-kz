'use strict';
// POST /api/results/login — Sign in with e-mail + password, sets the session cookie. Flow and rules: api/_lib/results.js
const { endpoint, actions } = require('../_lib/results');
module.exports = endpoint('login', actions.login);

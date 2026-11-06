'use strict';
// POST /api/results/request-password — Send a 6-digit password to a parent e-mail from the results sheet. Flow and rules: api/_lib/results.js
const { endpoint, actions } = require('../_lib/results');
module.exports = endpoint('request', actions.requestPassword);

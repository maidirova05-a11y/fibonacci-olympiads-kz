'use strict';
// POST /api/results/change-password — Change the password (needs the current one). Flow and rules: api/_lib/results.js
const { endpoint, actions } = require('../_lib/results');
module.exports = endpoint('change-password', actions.changePassword);

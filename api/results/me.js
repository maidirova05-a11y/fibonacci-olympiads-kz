'use strict';
// POST /api/results/me — Participants (name, score, certificate data) of the signed-in parent. Flow and rules: api/_lib/results.js
const { endpoint, actions } = require('../_lib/results');
module.exports = endpoint('me', actions.me);

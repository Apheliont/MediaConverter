const mysql = require("mysql");
const settings = require('../models/settings');
const pool = mysql.createPool({
    ...settings.get('database'),
    connectionLimit: 15
});

const category = require('./category')(pool);
const worker = require('./worker')(pool);
const error = require('./error')(pool);
const log = require('./log')(pool);

module.exports = {
  ...category,
  ...worker,
  ...error,
  ...log,
  pool
};
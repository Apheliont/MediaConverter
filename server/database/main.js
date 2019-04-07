const mysql = require("mysql");
const settings = require('../models/settings');
const pool = mysql.createPool({
    ...settings.get('database'),
    connectionLimit: 15
});

//require('./init')(pool);
const category = require('./category')(pool);
const worker = require('./worker')(pool);
const file = require('./file')(pool);
const log = require('./log')(pool);

module.exports = {
  ...category,
  ...worker,
  ...file,
  ...log,
  pool
};
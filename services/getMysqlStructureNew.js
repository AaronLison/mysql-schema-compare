const fs = require('fs');

const newSqlLocation = process.env.NEW_SQL_LOCATION;

module.exports = async function getMysqlStructureNew() {
    fs.copyFileSync(newSqlLocation, './input/new.sql');
    return fs.readFileSync(newSqlLocation, 'utf8');
}
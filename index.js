require('dotenv').config();

const getMysqlStructureOld = require('./services/getMysqlStructureOld');
const getMysqlStructureNew = require('./services/getMysqlStructureNew');
const getAlterStatements = require('./services/getAlterStatements');

const mysql = require('mysql2/promise');
const mysqlConfig = {
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    multipleStatements: true
};

const applyChanges = process.argv[2] === 'apply';

const optionalArgsStartIndex = applyChanges ? 3 : 2;
const optionalArgs = [...process.argv].slice(optionalArgsStartIndex);

const applyIndexChanges = optionalArgs.includes('--include-indexes');

(async () => {
    const mysqlConnection = await mysql.createConnection(mysqlConfig, mysqlConfig.database);

    const oldSchema = await getMysqlStructureOld(mysqlConnection, mysqlConfig.database); 
    const newSchema = await getMysqlStructureNew();

    const { createStatements, alterStatements, modifyStatements, alterKeysStatements } = await getAlterStatements(oldSchema, newSchema);

    if (applyChanges) {
        if(createStatements.length > 0){
            await mysqlConnection.query(createStatements.join('\n'));
        }
        if(alterStatements.length > 0){
            await mysqlConnection.query(alterStatements.join('\n'));
        }
        if(modifyStatements.length > 0){
            await mysqlConnection.query(modifyStatements.join('\n'));
        }
        if(applyIndexChanges && alterKeysStatements.length > 0){
            for (const alterKeysStatement of alterKeysStatements) {
                try {
                    await mysqlConnection.query(alterKeysStatement);
                } catch (error) {
                    const sqlMessage = error.sqlMessage || 'Error executing query';
                    const query = error.sql || alterKeysStatement;

                    console.error(`${sqlMessage}:`, {
                        query: query,
                    });
                }
            }

        }
    }

    await mysqlConnection.end();
})();
const fs = require('fs');


module.exports = async function getMysqlStructureOld(mysqlConnection, databaseName) {

    const [tables] = await mysqlConnection.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = ?
        ORDER BY table_name ASC
    `, [databaseName]);

    const queries = [];

    for (const table of tables) {
        const [res] = await mysqlConnection.query(`SHOW CREATE TABLE ${table.TABLE_NAME}`);
        let createQuery = res[0]['Create Table'];
        createQuery = convertCreateQueryToPhpMyAdminStyleQueries(createQuery);
        queries.push(createQuery);
    }

    // ok close mysqlConnection
    await mysqlConnection.end();

    const content = queries.join('\n\n');
    fs.writeFileSync('./input/old.sql', content);
    return content;
}

function convertCreateQueryToPhpMyAdminStyleQueries(createStatement) {
    createStatement = createStatement.replace(/CREATE TABLE IF NOT EXISTS/g, 'CREATE TABLE');
    const lines = createStatement.trim().split('\n')
    const tableName = createStatement.match(/CREATE TABLE `(\w+)`/)[1]
    const columnLines = []
    const indexLines = []
    let hasAutoIncrement = false
    let autoIncrementCol = ''
    let tableOptions = ''
  
    for (let line of lines) {
      line = line.trim()
  
      // capture table options
      if (line.startsWith(') ENGINE')) {
        // remove AUTO_INCREMENT
        tableOptions = line.replace(/\s*AUTO_INCREMENT\s*=\s*\d+/, '').trim().replace(/\s*;\s*$/, '')
        continue
      }
  
      // skip first and last lines
      if (line.startsWith('CREATE TABLE') || line === ')'){
        continue
      }
  
      // handle index lines
      if (/^(PRIMARY|UNIQUE|KEY)/i.test(line)) {
        const cleaned = line.replace(/,\s*$/, '')
        indexLines.push(cleaned)
        continue
      }
  
      // handle column lines
      if (line.startsWith('`')) {
        // strip AUTO_INCREMENT
        if (/AUTO_INCREMENT/.test(line)) {
          hasAutoIncrement = true
          autoIncrementCol = line.match(/^`(\w+)`/)[1]
          line = line.replace(/\s+AUTO_INCREMENT/, '')
        }

        // remove trailing comma for now
        line = line.replace(/,\s*$/, '')
  
        columnLines.push(line)
      }
    }
  
    const columnBlock = '  ' + columnLines.join(',\n  ')
    const indexBlock = indexLines
      .map((l, i) => (i === 0 ? `ALTER TABLE \`${tableName}\`\n  ADD ${l}` : `  ADD ${l}`))
      .join(',\n')
  
    let autoIncBlock = ''
    if (hasAutoIncrement) {
      autoIncBlock = `ALTER TABLE \`${tableName}\`\n  MODIFY \`${autoIncrementCol}\` int NOT NULL AUTO_INCREMENT;`
    }
  
    return `--
-- Table structure for table \`${tableName}\`
--
CREATE TABLE \`${tableName}\` (
${columnBlock}
${tableOptions};

--
-- Indexes for table \`${tableName}\`
--
${indexBlock};

--
-- AUTO_INCREMENT for table \`${tableName}\`
--
${autoIncBlock}`
}

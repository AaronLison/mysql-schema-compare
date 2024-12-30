
function getAlterStatements(oldSchema, newSchema) {

    const oldSchemaJson = schemaToJson(oldSchema);
    const newSchemaJson = schemaToJson(newSchema);

    const alterStatements = [];
    const modifyStatements = [];
    const createStatements = [];
    const debugDiffs = [];

    for(const tableName in newSchemaJson){
        const newTable = newSchemaJson[tableName]?.['create'];
        const newTableAlterRows = newSchemaJson[tableName]?.['alterRows'];
        const oldTable = oldSchemaJson[tableName]?.['create'];

        if(!oldTable){
            // table doesn't exist in the old schema, so it's a new table
            createStatements.push(createTable(tableName, newTableAlterRows, newTable));
            continue;
        }

        for(const column in newTable){
            if(!oldTable[column]){
                alterStatements.push(`ALTER TABLE \`${tableName}\` ADD \`${column}\` ${newTable[column]} AFTER \`${Object.keys(oldTable).pop()}\`;`);
            }
            else {
                const [modifyStatement, debugValue] = getModifyStatement(tableName, column, oldTable, newTable);
                if(modifyStatement){
                    modifyStatements.push(modifyStatement);
                }
                if(debugValue){
                    debugDiffs.push(debugValue);
                }
            }
        }
    }

    // because alter statements will always be after a specific column (where we don't take potential new columns into account)
    // we can just revert the order of the alter statements and it will be the correct order (because always AFTER 'last column', which is always the same one)
    alterStatements.reverse();

    fs.writeFileSync('./output/2_alter_statements.sql', alterStatements.join('\n'));
    fs.writeFileSync('./output/1_create_statements.sql', createStatements.join('\n'));
    fs.writeFileSync('./output/3_modify_statements.sql', modifyStatements.join('\n'));
    fs.writeFileSync('./output/3_modify_statements_debug.txt', debugDiffs.join('\n'));

    return [
        '',
        '--- ALTER STATEMENTS ---',
        ...alterStatements,
        '',
        '--- MODIFY STATEMENTS ---',
        ...modifyStatements,
        '',
    ].join('\n');
}

function schemaToJson(schema){
    const schemaJson = {};

    const lines = schema.split('\n');

    let createOpen = false;
    let alterOpen = false;
    let tableName = '';

    for(const line of lines){

        if(line.includes('CREATE TABLE ')){
            createOpen = true;
            tableName = line.split('`')[1];
            schemaJson[tableName] = {
                create: {},
                alterRows: [],
            };
            continue;
        }
        if(createOpen && line.includes(') ENGINE')){
            createOpen = false;
            continue;
        }

        if(line.includes('ALTER TABLE')){
            alterOpen = true;
            tableName = line.split('`')[1];
            continue;
        }
        if(alterOpen){
            schemaJson[tableName]['alterRows'].push(line);
            if(line.trim().endsWith(';')){
                alterOpen = false;
            }
            continue;
        }

        
        if(createOpen){
            if(line.includes('`')){
                const [_, column, ...rest] = line.split('`');
                let typeStr = rest.join('`').trim();
                // remove potential comments
                typeStr = typeStr.split('--')[0].trim();
                if(typeStr.endsWith(',')){
                    typeStr = typeStr.slice(0, -1);
                }
                schemaJson[tableName]['create'][column] = typeStr;
            }
            continue;
        }

    }

    return schemaJson;
}

function createTable(tableName, newTableAlterRows, newTable){
    const createStatements = [];
    createStatements.push('');
    createStatements.push(`CREATE TABLE \`${tableName}\` (\n${Object.entries(newTable).map(([column, type]) => `  \`${column}\` ${type}`).join(',\n')}\n);`);
    if(newTableAlterRows && newTableAlterRows.length > 0){
        let alterStr = `ALTER TABLE \`${tableName}\`\n`;
        let isAlterOpen = true;
        for(const alterRow of newTableAlterRows){
            if(!isAlterOpen){
                // alter not open anymore, but more alter statements are there
                // let's add the alter table again
                alterStr += `ALTER TABLE \`${tableName}\`\n`;
                isAlterOpen = true;
            }
            alterStr += alterRow+'\n';
            if(alterRow.trim().endsWith(';')){
                isAlterOpen = false;
            }
        }
        createStatements.push(alterStr);
    }
    return createStatements.join('\n');
}

function getModifyStatement(tableName, column, oldTable, newTable){
    let oldValue = oldTable[column].trim();
    let newValue = newTable[column].trim();

    // remove all double spaces that are NOT inside quotes
    oldValue = oldValue.split("'").map((part, i) => i % 2 === 0 ? part.replace(/  +/g, ' ') : part).join("'").trim();
    oldValue = oldValue.split("`").map((part, i) => i % 2 === 0 ? part.replace(/  +/g, ' ') : part).join("`").trim();
    oldValue = oldValue.replace('int(11)', 'int').replace('INT(11)', 'INT').replace(`'0.0'`, `'0`);
    newValue = newValue.split("'").map((part, i) => i % 2 === 0 ? part.replace(/  +/g, ' ') : part).join("'").trim();
    newValue = newValue.split("`").map((part, i) => i % 2 === 0 ? part.replace(/  +/g, ' ') : part).join("`").trim();
    newValue = newValue.replace('int(11)', 'int').replace('INT(11)', 'INT').replace(`'0.0'`, `'0`);

    if(oldValue.toLowerCase() == newValue.toLowerCase()){
        return [null, null];
    }

    const oldValueWithoutWhiteSpaceAndQuotes = oldValue.replace(/['"`]/g, '').replace(/ /g, '');
    const newValueWithoutWhiteSpaceAndQuotes = newValue.replace(/['"`]/g, '').replace(/ /g, '');

    if(oldValueWithoutWhiteSpaceAndQuotes.toLowerCase() == newValueWithoutWhiteSpaceAndQuotes.toLowerCase()){
        // sometimes a default value can have quotes vs in the sql file we don't add the quotes
        // same for extra whitespaces
        return [null, null];
    }
    if(oldValueWithoutWhiteSpaceAndQuotes.toLowerCase().replace('defaultnull', '') == newValueWithoutWhiteSpaceAndQuotes.toLowerCase().toLowerCase().replace('defaultnull', '')){
        // sometimes the mysql dump adds the default value, while we didn't add it in the sql file
        return [null, null];
    }
    if(oldValueWithoutWhiteSpaceAndQuotes.toLowerCase().replace('default', '') == newValueWithoutWhiteSpaceAndQuotes.toLowerCase()){
        // sometimes the mysql dump adds the default value, while we didn't add it in the sql file
        return [null, null];
    }
    if(oldValueWithoutWhiteSpaceAndQuotes.toLowerCase().replace('charactersetlatin1', '') == newValueWithoutWhiteSpaceAndQuotes.toLowerCase()){
        return [null, null];
    }
    if(oldValueWithoutWhiteSpaceAndQuotes.toLowerCase().replace('collatelatin1_general_ci', '') == newValueWithoutWhiteSpaceAndQuotes.toLowerCase()){
        return [null, null];
    }

    let modifyStatement = '';
    if(oldValue.toLowerCase().trim().startsWith('enum') && newValue.toLowerCase().trim().startsWith('enum')){

        if(oldValue.split('(').length !== 2 || newValue.split('(').length !== 2){
            throw new Error('Cannot parse ENUM');
        }
        if(oldValue.split(')').length !== 2 || newValue.split(')').length !== 2){
            throw new Error('Cannot parse ENUM');
        }

        const [oldInbetweenEnum, oldAfterEnum] = oldValue.split('(')[1].split(')');
        const [newInbetweenEnum, newAfterEnum] = newValue.split('(')[1].split(')');
        const oldEnumValues = oldInbetweenEnum.split("'").filter((_, i) => i % 2 === 1);
        const newEnumValues = newInbetweenEnum.split("'").filter((_, i) => i % 2 === 1);

        const newlyAddedEnumValues = newEnumValues.filter(value => !oldEnumValues.includes(value));
        if(newlyAddedEnumValues.length == 0 && oldAfterEnum.trim().toLowerCase() == newAfterEnum.trim().toLowerCase()){
            // no new added values and no changes
            return [null, null];
        }

        // we don't want to remove ENUM values
        // only add the new ones
        const enumValuesStr = [...new Set([...oldEnumValues, ...newEnumValues])].map(value => `'${value}'`).join(',');
        modifyStatement = `ALTER TABLE \`${tableName}\` MODIFY \`${column}\` ENUM(${enumValuesStr})${newAfterEnum};`;
    }else{
        modifyStatement = `ALTER TABLE \`${tableName}\` MODIFY \`${column}\` ${newTable[column]};`;
    }


    let debugValue = `=== ${tableName} -> ${column} ===\nBEFORE: ${oldValue.toLowerCase()}\nAFTER:  ${newValue.trim().toLowerCase()}\n`;
    if(modifyStatement.split('ENUM')[1]){
        debugValue += `MODIFY: ENUM${modifyStatement.split('ENUM')[1]}\n`;
    }

    return [
        modifyStatement,
        debugValue,
    ]
}

const fs = require('fs');
const oldSchema = fs.readFileSync('./input/old.sql', 'utf8');
const newSchema = fs.readFileSync('./input/new.sql', 'utf8');
const res = getAlterStatements(oldSchema, newSchema);
// console.log(res);
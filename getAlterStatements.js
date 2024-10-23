
function getAlterStatements(oldSchema, newSchema) {

    const oldSchemaJson = schemaToJson(oldSchema);
    const newSchemaJson = schemaToJson(newSchema);

    const alterStatements = [];
    const modifyStatements = [];
    const debugDiffs = [];

    for(const tableName in newSchemaJson){
        const newTable = newSchemaJson[tableName];
        const oldTable = oldSchemaJson[tableName];

        if(!oldTable){
            console.log(`Table ${tableName} does not exist in old schema`);
            continue;
        }

        for(const column in newTable){
            if(!oldTable[column]){
                alterStatements.push(`ALTER TABLE \`${tableName}\` ADD \`${column}\` ${newTable[column].replace(/ NOT NULL/, '')} AFTER \`${Object.keys(oldTable).pop()}\`;`);
            }
            else if(oldTable[column].trim().toLowerCase().split(' ').join('') !== newTable[column].trim().toLowerCase().split(' ').join('')){
                debugDiffs.push(
                    `=== ${tableName} -> ${column} ===`,
                    `BEFORE: ${oldTable[column].trim().toLowerCase()}`,
                    `AFTER:  ${newTable[column].trim().toLowerCase()}`,
                    ``,
                )
                modifyStatements.push(`ALTER TABLE \`${tableName}\` MODIFY \`${column}\` ${newTable[column]};`);
            }

        }
    }

    fs.writeFileSync('./output/alter_statements.sql', alterStatements.join('\n'));
    fs.writeFileSync('./output/modify_statements.sql', modifyStatements.join('\n'));
    fs.writeFileSync('./output/modify_statements_debug.txt', debugDiffs.join('\n'));

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

    let bracketOpen = false;
    let tableName = '';

    for(const line of lines){

        if(line.includes('CREATE TABLE')){
            bracketOpen = true;
            tableName = line.split('`')[1];
            schemaJson[tableName] = {};
        }
        else if(line.includes(') ENGINE')){
            bracketOpen = false;
        }
        else if(bracketOpen){
            if(line.includes('`')){
                const [_, column, ...rest] = line.split('`');
                let typeStr = rest.join(' ').trim();
                if(typeStr.endsWith(',')){
                    typeStr = typeStr.slice(0, -1);
                }
                schemaJson[tableName][column] = typeStr;
            }
        }

    }

    return schemaJson;
}

const fs = require('fs');
const oldSchema = fs.readFileSync('./input/old.sql', 'utf8');
const newSchema = fs.readFileSync('./input/new.sql', 'utf8');
const res = getAlterStatements(oldSchema, newSchema);
// console.log(res);
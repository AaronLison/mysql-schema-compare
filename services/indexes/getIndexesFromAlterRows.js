module.exports = function getIndexesJsonFromAlterRows(alterRows) {
    const indexes = {};

    for (const alterRow of alterRows) {
        const trimmedRow = alterRow.trim();
        // remove last character (semicolor or comma)
        const row = trimmedRow.trim().slice(0, -1);

        if(!row.startsWith('ADD ')) {
            continue;
        }
        
        // handle primary key separately
        const primaryKeyRegex = /^ADD PRIMARY KEY\s*\(([^)]+)\)/i
        const primaryKeyMatch = row.match(primaryKeyRegex);
        if (primaryKeyMatch) {
            const columns = primaryKeyMatch[1].split(',').map(col => trimQuotes(col));
            const keyName = trimQuotes(columns[0]); // use the first column as the key name
            indexes[keyName] = {
                type: 'PRIMARY',
                columns: columns
            };
            continue;
        }

        // ADD [UNIQUE] KEY `name` (`column1`, `column2`, ...)
        const indexRegex = /^ADD\s+(UNIQUE\s+)?KEY\s+`?([\w\d_]+)?`?\s*\(([^)]+)\)/i;
        const indexMatch = row.match(indexRegex)
        if (indexMatch) {
            const isUnique = !!indexMatch[1];
            const columns = (indexMatch[3]).split(',').map(col => trimQuotes(col));
            const keyName = indexMatch[2] || trimQuotes(columns[0]); // use the first column as the key name

            indexes[keyName] = {
                type: isUnique ? 'UNIQUE' : 'INDEX',
                columns: columns
            };
            continue;
        }
    }

    return indexes
}

function trimQuotes(str) {
    str = str.trim();
    if (str.startsWith('`') && str.endsWith('`')) {
        return str.slice(1, -1);
    }

    return str;
}
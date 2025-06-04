module.exports.findIdenticalIndex = function findIdenticalIndex(indexes, indexName, indexInfo) {
    const indexInfoByName = indexes[indexName] || null;

    if(indexInfoByName && isIndexIdentical(indexInfoByName, indexInfo)) {
        return {
            identicalIndexName: indexName,
            name: indexName,
            info: indexInfo,
        };
    }

    for (const [currentIndexName, currentIndexInfo] of Object.entries(indexes)) {
        if(isIndexIdentical(currentIndexInfo, indexInfo)) {
            return {
                identicalIndexName: currentIndexName,
                name: indexName,
                info: indexInfo,
            };
        }
    }

    return null;
}

function isIndexIdentical(indexInfoA, indexInfoB) {
    if (indexInfoA.type !== indexInfoB.type) {
        return false;
    }

    if (indexInfoA.columns.length !== indexInfoB.columns.length) {
        return false;
    }

    for (let i = 0; i < indexInfoA.columns.length; i++) {
        if (indexInfoA.columns[i] !== indexInfoB.columns[i]) {
            return false;
        }
    }

    return true;
}
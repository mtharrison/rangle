'use strict';

// Load modules


// Declare internals

const internals = {
    maxClientChunks: 5,
    maxClientStorageRatio: 1.2
};


internals.rangesToObjects = function (ranges) {

    return ranges.map((r) => {

        const parts = r.split(':');
        const range = parts[0];
        const rangeParts = range.split('-');

        return {
            range,
            num: parseInt(parts[1]),
            from: parseInt(rangeParts[0]),
            to: parseInt(rangeParts[1])
        };
    });
};


internals.objectsToRanges = function (objs) {

    return objs.map((o) => o.range);
};


internals.modifiedSince = function (server, time) {

    for (const i in server) {
        if (server[i].modified > time) {
            return true;
        }
    }

    return false;
};


internals.consolidateChunks = function (items, chunks) {

    const validItemsPerChunk = chunks.map((chunk) => internals.itemsInRange(chunk.from, chunk.to, items));
    const indices = internals.minContiguousTwoSubarray(validItemsPerChunk);
    const range = `${chunks[indices.left].from}-${chunks[indices.right].to}`;

    // Replace consolidated ranges

    chunks.splice(indices.left, (indices.right - indices.left + 1), { range });
};


internals.itemsInRange = function (lower, upper, items) {

    let num = 0;

    for (const i in items) {
        const ts = items[i].modified;
        if (ts > lower && ts <= upper) {
            num++;
        }
    }

    return num;
};


internals.minContiguousTwoSubarray = function (arr) {

    let left = 0;
    let right = 1;
    let min = arr[left] + arr[right];

    for (let i = 1; i < arr.length - 1; ++i) {
        if (arr[i] + arr[i + 1] < min) {
            left = i;
            right = i + 1;
            min = arr[i] + arr[i + 1];
        }
    }

    return { left, right };
};


exports.ranges = function (items, ranges) {

    // If client has no ranges, it should request everything

    if (ranges.length === 0) {
        return ['0->'];
    }

    // Transform from ['0-10:8'] to [{ range: '0-10', num: 8 , from: 0, to: 10 }] format for internal use

    const chunks = internals.rangesToObjects(ranges);
    const lastClientUpdate = chunks[chunks.length - 1].to;
    const changed = internals.modifiedSince(items, lastClientUpdate);

    // If the client is up to date, use same chunks

    if (!changed) {
        return internals.objectsToRanges(chunks);
    }

    const totalClientItems = chunks.reduce((prev, curr) => prev + curr.num, 0);
    const totalServerItems = Object.keys(items).length;

    // If the client's total storage is beyond the server storage * maxClientStorageRatio
    // we must indicate that the client should start over

    if ((totalClientItems / totalServerItems) > internals.maxClientStorageRatio) {
        return ['0->'];
    }

    // If the client has reached their limit of chunks, we must consolidate two
    // of their existing chunks first

    if (chunks.length >= internals.maxClientChunks) {
        internals.consolidateChunks(items, chunks);
    }

    // Add the latest chunk

    chunks.push({ range: `${lastClientUpdate}->` });

    // Return the new ranges

    return internals.objectsToRanges(chunks);
};

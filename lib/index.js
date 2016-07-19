'use strict';

// Load modules


// Declare internals

const internals = {};


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


internals.modifiedSince = function (server, time, path) {

    for (const i in server) {
        if (internals.get(server[i], path) > time) {
            return true;
        }
    }

    return false;
};


internals.combineChunks = function (chunks, left, right) {

    const range = `${chunks[left].from}-${chunks[right].to}`;
    chunks.splice(left, (right - left + 1), { range });
};


internals.get = function (obj, path) {

    const split = path.split('.');

    // fast paths

    if (split.length === 1) {
        return obj[path];
    }

    if (split.length === 2) {
        return obj[split[0]][split[1]];
    }
};


internals.consolidateChunks = function (items, chunks, options) {

    const validItemsPerChunk = chunks.map((chunk) => internals.itemsInRange(chunk.from, chunk.to, items, options.path));

    // Check if any of the chunks exceeds the limit for ratio of invalid items (space optimisation)

    for (let i = 0; i < chunks.length; ++i) {
        if ((validItemsPerChunk[i] / chunks[i].num) <= (options.minValidChunkRatio || 0.9)) {
            const left = (i === chunks.length - 1) ? i - 1 : i;
            const right = left + 1;
            internals.combineChunks(chunks, left, right);
            return;
        }
    }

    // Otherwise, pick the 2 contiguous with minimum number of valid items to merge (lowest cost)

    const indices = internals.minContiguousTwoSubarray(validItemsPerChunk);
    internals.combineChunks(chunks, indices.left, indices.right);
};


internals.itemsInRange = function (lower, upper, items, path) {

    let num = 0;

    for (const i in items) {
        const ts = internals.get(items[i], path);
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


internals.findMostRecentChange = function (items, path) {

    let ts = 0;

    for (const i in items) {
        const modified = internals.get(items[i], path);
        if (modified > ts) {
            ts = modified;
        }
    }

    return ts;
};


exports.ranges = function (items, ranges, options) {

    options = options || {};
    options.path = options.path || 'modified';

    const mostRecentChange = internals.findMostRecentChange(items, options.path);

    // If client has no ranges, it should request everything

    if (ranges.length === 0) {
        return [`0-${mostRecentChange}`];
    }

    // Transform from ['0-10:8'] to [{ range: '0-10', num: 8 , from: 0, to: 10 }] format for internal use

    const chunks = internals.rangesToObjects(ranges);
    const lastClientUpdate = chunks[chunks.length - 1].to;
    const changed = internals.modifiedSince(items, lastClientUpdate, options.path);

    // If the client is up to date, use same chunks

    if (!changed) {
        return internals.objectsToRanges(chunks);
    }

    // If the client has reached their limit of chunks, we must consolidate two
    // of their existing chunks first

    if (chunks.length >= (options.maxClientChunks || 5)) {
        internals.consolidateChunks(items, chunks, options);
    }

    // Add the latest chunk

    chunks.push({ range: `${lastClientUpdate}-${mostRecentChange}` });

    // Return the new ranges

    return internals.objectsToRanges(chunks);
};

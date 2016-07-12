'use strict';

// Load modules

const Code = require('code');
const Lab = require('lab');
const Rangle = require('../');


// Declare internals

const internals = {};


// Test shortcuts

const lab = exports.lab = Lab.script();
const describe = lab.experiment;
const expect = Code.expect;
const it = lab.test;


describe('Rangle', () => {

    it('should return the same ranges when nothing has changed', (done) => {

        const ranges = ['0-10:10', '10-20:2', '20-30:3', '30-40:4'];

        const items = {
            1: { modified: 1 },
            2: { modified: 25 },
            3: { modified: 31 },
            4: { modified: 38 },
            5: { modified: 1 },
            6: { modified: 28 },
            7: { modified: 8 },
            8: { modified: 24 },
            9: { modified: 8 },
            10: { modified: 20 }
        };

        const newRanges = Rangle.ranges(items, ranges);

        expect(newRanges).to.equal(['0-10', '10-20', '20-30', '30-40']);
        done();
    });

    it('should add a new range when below limit of ranges', (done) => {

        const ranges = ['0-10:2', '10-20:2'];

        const items = {
            1: { modified: 1 },
            2: { modified: 3 },
            3: { modified: 11 },
            4: { modified: 18 },
            5: { modified: 24 }
        };

        const newRanges = Rangle.ranges(items, ranges);

        expect(newRanges).to.equal(['0-10', '10-20', '20->']);
        done();
    });
});



//
// // Case 2 - Storing too much
//
// client = [
//     { range: '0-10', num: 100 }, // 4 items
//     { range: '10-20', num: 2 }, // 1 item
//     { range: '20-30', num: 3 }, // 4 items
//     { range: '30-40', num: 4 }  // 1 items
// ];
//
// server = {
//     1: 1,
//     2: 25,
//     3: 31,
//     4: 45,
//     5: 1,
//     6: 28,
//     7: 8,
//     8: 24,
//     9: 8,
//     10: 20
// };
//
// console.log(getChunks(server, client));
//
// // Case 3 - Add a new chunk
//
// client = [
//     { range: '0-10', num: 10 }, // 4 items
//     { range: '10-20', num: 2 }, // 1 item
//     { range: '20-30', num: 3 }, // 4 items
//     { range: '30-40', num: 4 }  // 1 items
// ];
//
// server = {
//     1: 1,
//     2: 25,
//     3: 31,
//     4: 45,
//     5: 1,
//     6: 28,
//     7: 8,
//     8: 24,
//     9: 8,
//     10: 20
// };
//
// console.log(getChunks(server, client));
//
// // Case 4 - Consolidation is required
//
// client = [
//     { range: '0-10', num: 2 },      // c = 3, b = 1, f = -2
//     { range: '10-20', num: 2 },     // c = 1, b = 1, f = 0
//     { range: '20-30', num: 3 },     // c = 4, b = 1, f = -3
//     { range: '30-40', num: 4 },     // c = 1, b = 3, f = 2      // should pick
//     { range: '40-50', num: 4 }      // c = 3, b = 1, d = -2     // these chunks
// ];
//
// server = {
//     1: 1,
//     2: 25,
//     3: 31,
//     4: 45,
//     5: 60,
//     6: 28,
//     7: 8,
//     8: 24,
//     9: 8,
//     10: 20,
//     11: 44,
//     12: 46
// };
//
// console.log(getChunks(server, client));

//
// Algorithm in pseudocode
//
// GetChunkList (server, client, { maxChunks, maxStorageRatio, benefitWeighting, costWeighting }):
//
//     mostRecentClientUpdate = getMostRecentUpdate(client)
//     changed = UpdatedSince(server, mostRecentClientUpdate)
//
//     // Nothing has changed, we don't do anything
//
//     if !changed
//         return client;
//
//     totalClientItems = getTotalClientItems(client)
//     totalServerItems = getTotalServerItems(server)
//
//     // Check if client should bail out of this dance because it's storing too much
//
//     if (totalClientItems / totalServerItems) > maxStorageRatio
//         return StartOver(server)
//
//     // Check if we can just add another chunk
//
//     clientChunks = getClientChunks(client)
//
//     if clientChunks >= maxChunks
//         consolidatedChunks = ConsolidateMinCostSubarray(server, { benefitWeighting, costWeighting })
//         return AddNewChunk(server, consolidatedChunks)
//     else
//         return AddNewChunk(server, client)

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

    it('should return the catch-all range if client has no ranges', (done) => {

        const ranges = [];

        const items = {
            1: { modified: 1 }
        };

        const newRanges = Rangle.ranges(items, ranges);

        expect(newRanges).to.equal(['0->']);
        done();
    });

    it('should return the same ranges when there\'s nothing new to fetch', (done) => {

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

    it('should consolidate chunks with least valid items when required', (done) => {

        const ranges = [
            '0-10:2',   // 2 valid items
            '10-20:1',  // 1 valid item  --| these chunks
            '20-30:1',  // 1 valid item  --| will merge
            '30-40:2',  // 2 valid items
            '40-50:2'   // 2 valid items
        ];

        const items = {
            1: { modified: 11 },
            2: { modified: 22 },
            3: { modified: 5 },
            4: { modified: 5 },
            5: { modified: 32 },
            6: { modified: 38 },
            7: { modified: 41 },
            8: { modified: 49 },
            9: { modified: 58 }
        };

        const newRanges = Rangle.ranges(items, ranges);

        expect(newRanges).to.equal(['0-10', '10-30', '30-40', '40-50', '50->']);
        done();
    });

    it('should evict a chunk where ratio of valid items is too low', (done) => {

        const ranges = [
            '0-10:2',
            '10-20:2',
            '20-30:3',  // 2/3 = 0.67 - should be merged with next chunk
            '30-40:2',
            '40-50:2'
        ];

        const items = {
            1: { modified: 1 },
            2: { modified: 1 },
            3: { modified: 11 },
            4: { modified: 18 },
            5: { modified: 52 },
            6: { modified: 23 },
            7: { modified: 24 },
            8: { modified: 32 },
            9: { modified: 34 },
            10: { modified: 42 },
            11: { modified: 48 }
        };

        const newRanges = Rangle.ranges(items, ranges);

        expect(newRanges).to.equal(['0-10', '10-20', '20-40', '40-50', '50->']);
        done();
    });

    it('should evict last chunk if ratio of valid items is too low', (done) => {

        const ranges = [
            '0-10:2',
            '10-20:2',
            '20-30:3',
            '30-40:1',
            '40-50:2'  // 1/2 = 0.5 - should be merged with previous chunk
        ];

        const items = {
            1: { modified: 1 },
            2: { modified: 1 },
            3: { modified: 11 },
            4: { modified: 18 },
            5: { modified: 52 },
            6: { modified: 23 },
            7: { modified: 24 },
            8: { modified: 32 },
            9: { modified: 26 },
            10: { modified: 42 }
        };

        const newRanges = Rangle.ranges(items, ranges);

        expect(newRanges).to.equal(['0-10', '10-20', '20-30', '30-50', '50->']);
        done();
    });
});

import { Readable } from 'node:stream';

import { csvContentToTableData, readCsvChunkFromStream } from './csvChunk';

describe('readCsvChunkFromStream', () => {
  it('returns header + requested rows (1-based start, excluding header)', async () => {
    const csv = ['number, name', '1, john', '2, pablo', '3, rey', '4, joe', ''].join('\n');
    const { content, returned } = await readCsvChunkFromStream(Readable.from([csv]), {
      start: 2,
      limit: 2,
    });

    expect(returned).toBe(2);
    expect(content).toBe(['number, name', '2, pablo', '3, rey'].join('\n'));
  });

  it('returns only header when start is beyond file length', async () => {
    const csv = ['a,b', '1,2', ''].join('\n');
    const { content, returned } = await readCsvChunkFromStream(Readable.from([csv]), {
      start: 10,
      limit: 2,
    });

    expect(returned).toBe(0);
    expect(content).toBe('a,b');
  });

  it('handles CSV with only a header line', async () => {
    const csv = ['a,b', ''].join('\n');
    const { content, returned } = await readCsvChunkFromStream(Readable.from([csv]), {
      start: 1,
      limit: 10,
    });

    expect(returned).toBe(0);
    expect(content).toBe('a,b');
  });
});

describe('csvContentToTableData', () => {
  it('parses header + rows into execute_query-style columns', () => {
    const content = ['number, name', '2, pablo', '3, rey'].join('\n');
    expect(csvContentToTableData(content)).toEqual({
      data: [
        { name: 'number', value: [2, 3] },
        { name: 'name', value: ['pablo', 'rey'] },
      ],
      dataColumns: { x: ['number', 'name'], y: [] },
    });
  });

  it('handles quoted fields with commas', () => {
    const content = ['a,b,c', '"1,2",3,4'].join('\n');
    expect(csvContentToTableData(content)).toEqual({
      data: [
        { name: 'a', value: ['1,2'] },
        { name: 'b', value: [3] },
        { name: 'c', value: [4] },
      ],
      dataColumns: { x: ['a', 'b', 'c'], y: [] },
    });
  });
});

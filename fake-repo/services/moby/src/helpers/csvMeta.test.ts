import { buildCsvMetaFilePath, extractCsvMetaInfo } from './csvMeta';

describe('buildCsvMetaFilePath', () => {
  it('replaces extension with .meta.json in same directory', () => {
    expect(buildCsvMetaFilePath('data/meta_image_ads_rank_raw_last30d.csv')).toBe(
      'data/meta_image_ads_rank_raw_last30d.meta.json',
    );
  });

  it('works with root-level file', () => {
    expect(buildCsvMetaFilePath('file.csv')).toBe('file.meta.json');
  });

  it('handles multiple dots', () => {
    expect(buildCsvMetaFilePath('data/foo.v1.csv')).toBe('data/foo.v1.meta.json');
  });
});

describe('extractCsvMetaInfo', () => {
  it('extracts row_count and sql', () => {
    expect(
      extractCsvMetaInfo({
        row_count: 22,
        sql: 'SELECT 1;',
      }),
    ).toEqual({ totalRows: 22, sql: 'SELECT 1;' });
  });

  it('coerces row_count string', () => {
    expect(extractCsvMetaInfo({ row_count: '22', sql: 'SELECT 1;' })).toEqual({
      totalRows: 22,
      sql: 'SELECT 1;',
    });
  });

  it('returns nulls when missing', () => {
    expect(extractCsvMetaInfo({})).toEqual({ totalRows: null, sql: null });
  });
});

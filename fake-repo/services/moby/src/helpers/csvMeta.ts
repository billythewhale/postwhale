import path from 'node:path';

export type CsvMetaInfo = {
  totalRows: number | null;
  sql: string | null;
};

export function buildCsvMetaFilePath(csvFilePath: string): string {
  const posixPath = path.posix;
  const dir = posixPath.dirname(csvFilePath);
  const base = posixPath.basename(csvFilePath, posixPath.extname(csvFilePath));
  const metaName = `${base}.meta.json`;
  return dir === '.' ? metaName : posixPath.join(dir, metaName);
}

function coerceFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function extractCsvMetaInfo(meta: unknown): CsvMetaInfo {
  if (!meta || typeof meta !== 'object') {
    return { totalRows: null, sql: null };
  }

  const rowCount = coerceFiniteNumber((meta as any).row_count);
  const sqlValue = (meta as any).sql;
  const sql = typeof sqlValue === 'string' && sqlValue.trim() ? sqlValue : null;

  return {
    totalRows: rowCount,
    sql,
  };
}

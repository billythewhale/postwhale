import { createInterface } from 'node:readline';
import type { Readable } from 'node:stream';

export type ReadCsvChunkOptions = {
  /**
   * 1-based data row index (excluding the header line).
   * Example: start=2 returns the 2nd data row.
   */
  start: number;
  /** Number of data rows to return (excluding the header line). */
  limit: number;
};

export type ReadCsvChunkResult = {
  content: string;
  returned: number;
};

export type CsvTableData = {
  data: { name: string; value: Array<string | number> }[];
  dataColumns: {
    x: string[];
    y: string[];
  };
};

// https://stackoverflow.com/questions/175739/how-can-i-check-if-a-string-is-a-valid-number
function isNumeric(str: unknown): boolean {
  if (typeof str !== 'string') return false;
  return !isNaN(Number(str)) && !isNaN(parseFloat(str));
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      current += char;
      i += 1;
      continue;
    }

    if (char === ',') {
      fields.push(current.trim());
      current = '';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    current += char;
    i += 1;
  }

  fields.push(current.trim());
  return fields;
}

function stripBom(value: string): string {
  return value.replace(/^\uFEFF/, '');
}

export function csvContentToTableData(content: string): CsvTableData {
  const [rawHeaderLine, ...rawRowLines] = content.split('\n');
  const headerLine = rawHeaderLine ?? '';

  let columns = parseCsvLine(headerLine).map(stripBom);
  if (columns.length === 0) {
    columns = [];
  }

  const rows = rawRowLines.filter((line) => line.trim() !== '').map((line) => parseCsvLine(line));

  const maxCols = Math.max(columns.length, ...rows.map((row) => row.length), 0);
  if (maxCols > columns.length) {
    const extraCount = maxCols - columns.length;
    const startIndex = columns.length + 1;
    for (let i = 0; i < extraCount; i++) {
      columns.push(`column_${startIndex + i}`);
    }
  }

  const normalizedRows = rows.map((row) => {
    const next = row.slice(0, maxCols);
    while (next.length < maxCols) {
      next.push('');
    }
    return next;
  });

  const data: CsvTableData['data'] = [];
  for (let colIndex = 0; colIndex < columns.length; colIndex++) {
    const columnName = columns[colIndex] ?? '';
    const columnValues = normalizedRows.map((row) => row[colIndex] ?? '');
    const nonEmptyValues = columnValues.filter((value) => value !== '');
    const shouldParseColumnValues =
      nonEmptyValues.length > 0 && nonEmptyValues.every((value) => isNumeric(value));

    data.push({
      name: columnName,
      value: shouldParseColumnValues
        ? columnValues.map((value) => (value === '' ? '' : Number(value)))
        : columnValues,
    });
  }

  return {
    data,
    dataColumns: { x: columns, y: [] },
  };
}

export async function readCsvChunkFromStream(
  stream: Readable,
  options: ReadCsvChunkOptions,
): Promise<ReadCsvChunkResult> {
  const { start, limit } = options;

  const rl = createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  const lines: string[] = [];
  let sawHeader = false;
  let dataRowIndex = 0;
  let returned = 0;

  try {
    for await (const line of rl) {
      if (!sawHeader) {
        sawHeader = true;
        lines.push(line);
        continue;
      }

      dataRowIndex += 1;

      if (dataRowIndex < start) {
        continue;
      }

      if (returned < limit) {
        lines.push(line);
        returned += 1;
      }

      if (returned >= limit) {
        break;
      }
    }
  } finally {
    rl.close();
    stream.destroy();
  }

  return { content: lines.join('\n'), returned };
}

import path from 'node:path';

import { getStorageClient } from '@tw/utils/module/gcs';
import { logger } from '@tw/utils/module/logger';
import { getSecret } from '@tw/utils/module/secrets';
import {
  BadRequestErrorResponse,
  ErrorResponse,
  NotFoundErrorResponse,
  ServerErrorResponse,
  SuccessResponse,
} from '@tw/utils/module/api/endpoint';
import type { FilePreviewRequestQuery, FilePreviewResponse, MediaKind } from '@tw/shared-types';

import {
  generateSignedUrlsForFiles,
  parseGcsUrl,
} from '../events/transform/outputFormatters/utils';
import { csvContentToTableData, readCsvChunkFromStream } from '../helpers/csvChunk';
import { buildCsvMetaFilePath, extractCsvMetaInfo, type CsvMetaInfo } from '../helpers/csvMeta';

const DEFAULT_START = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

const IMAGE_EXTENSIONS = new Set([
  'apng',
  'avif',
  'bmp',
  'gif',
  'heic',
  'heif',
  'jpeg',
  'jpg',
  'png',
  'svg',
  'tif',
  'tiff',
  'webp',
]);

const VIDEO_EXTENSIONS = new Set(['avi', 'm4v', 'mkv', 'mov', 'mp4', 'mpeg', 'mpg', 'webm']);

const WEBPAGE_EXTENSIONS = new Set(['html']);

function normalizeExtension(filePath: string, fileExtension?: string): string {
  const rawExt = (fileExtension || path.extname(filePath)).toLowerCase();
  return rawExt.startsWith('.') ? rawExt.slice(1) : rawExt;
}

function validatePositiveInt(value: number, defaultValue: number, max = Infinity): number {
  if (!Number.isFinite(value)) return defaultValue;
  return Math.min(max, Math.max(1, Math.floor(value)));
}

function sanitizeRelativeGcsPath(filePath: string): string {
  const trimmed = filePath.trim();
  if (!trimmed) {
    throw new BadRequestErrorResponse('filePath is required');
  }
  if (trimmed.includes('\0') || /[\r\n]/.test(trimmed)) {
    throw new BadRequestErrorResponse('filePath contains invalid characters');
  }
  if (trimmed.startsWith('/') || trimmed.startsWith('\\')) {
    throw new BadRequestErrorResponse('filePath must be relative to workingDir');
  }
  const parts = trimmed.split('/').filter(Boolean);
  if (parts.some((p) => p === '..')) {
    throw new BadRequestErrorResponse('filePath must not contain ".." segments');
  }
  return parts.join('/');
}

let cachedStorage: ReturnType<typeof getStorageClient> | null = null;
function getAuthedStorageClient() {
  cachedStorage ??= getStorageClient({
    forceCloud: true,
    storageOptions: {
      credentials: {
        private_key: getSecret('SERVICE_ACCOUNT_PRIVATE_KEY'),
        client_email: getSecret('SERVICE_ACCOUNT_EMAIL'),
      },
    },
  });
  return cachedStorage;
}

async function getSignedUrlForMediaFile(params: {
  bucketName: string;
  basePath: string;
  safeFilePath: string;
  mediaKind: MediaKind;
}): Promise<FilePreviewResponse> {
  const { bucketName, basePath, safeFilePath, mediaKind } = params;

  const normalizedWorkingDir = `gs://${bucketName}/${basePath}`;
  const signedFiles = await generateSignedUrlsForFiles(normalizedWorkingDir, [safeFilePath]);
  const signedUrl = signedFiles[0]?.signedUrl;

  if (!signedUrl) {
    throw new ServerErrorResponse('Failed to generate signed URL for file');
  }

  return { kind: mediaKind, signedUrl };
}

async function streamCSVFile(params: {
  storage: ReturnType<typeof getStorageClient>;
  bucketName: string;
  basePath: string;
  fullPath: string;
  safeFilePath: string;
  start?: string;
  limit?: string;
  workingDir: string;
  filePath: string;
}): Promise<FilePreviewResponse> {
  const {
    storage,
    bucketName,
    basePath,
    fullPath,
    safeFilePath,
    start,
    limit,
    workingDir,
    filePath,
  } = params;

  const parsedStart = validatePositiveInt(
    start ? parseInt(start, 10) : DEFAULT_START,
    DEFAULT_START,
  );
  const parsedLimit = validatePositiveInt(
    limit ? parseInt(limit, 10) : DEFAULT_LIMIT,
    DEFAULT_LIMIT,
    MAX_LIMIT,
  );

  const file = storage.bucket(bucketName).file(fullPath);
  const stream = file.createReadStream();

  const [chunkResult, metaResult] = await Promise.allSettled([
    readCsvChunkFromStream(stream, {
      start: parsedStart,
      limit: parsedLimit,
    }),
    tryLoadCsvMeta(storage, {
      bucketName,
      basePath,
      csvRelativePath: safeFilePath,
    }),
  ]);

  if (chunkResult.status === 'rejected') {
    throw chunkResult.reason;
  }

  const metaInfo =
    metaResult.status === 'fulfilled' ? metaResult.value : { totalRows: null, sql: null };

  if (metaResult.status === 'rejected') {
    logger.warn(
      { error: metaResult.reason, workingDir, filePath },
      'Failed to load CSV meta info (ignored)',
    );
  }

  const { content, returned } = chunkResult.value;

  return {
    kind: 'csv',
    content: csvContentToTableData(content),
    start: parsedStart,
    limit: parsedLimit,
    returned,
    totalRows: metaInfo.totalRows,
    sql: metaInfo.sql,
  };
}

export async function filePreviewEndpoint(
  data: FilePreviewRequestQuery,
): Promise<SuccessResponse<FilePreviewResponse>> {
  const { workingDir, filePath, fileExtension, start, limit } = data;

  if (!workingDir) {
    throw new BadRequestErrorResponse('workingDir is required');
  }

  if (!filePath) {
    throw new BadRequestErrorResponse('filePath is required');
  }

  const gcsPath = parseGcsUrl(workingDir);
  if (!gcsPath) {
    throw new BadRequestErrorResponse('workingDir must be a valid gs:// URL', { workingDir });
  }

  const safeFilePath = sanitizeRelativeGcsPath(filePath);
  const basePath = gcsPath.basePath.replace(/\/+$/, '');
  const fullPath = `${basePath}/${safeFilePath}`;
  const ext = normalizeExtension(safeFilePath, fileExtension);

  let mediaKind: MediaKind | null = null;
  if (IMAGE_EXTENSIONS.has(ext)) {
    mediaKind = 'image';
  } else if (VIDEO_EXTENSIONS.has(ext)) {
    mediaKind = 'video';
  } else if (WEBPAGE_EXTENSIONS.has(ext)) {
    mediaKind = 'webpage';
  }

  try {
    const storage = getAuthedStorageClient();
    const file = storage.bucket(gcsPath.bucketName).file(fullPath);

    const [exists] = await file.exists();
    if (!exists) {
      throw new NotFoundErrorResponse('File not found', { workingDir, filePath });
    }

    if (mediaKind) {
      const response = await getSignedUrlForMediaFile({
        bucketName: gcsPath.bucketName,
        basePath,
        safeFilePath,
        mediaKind,
      });
      return new SuccessResponse(response);
    }

    if (ext !== 'csv') {
      const downloaded = await file.download();
      const buffer = Array.isArray(downloaded) ? downloaded[0] : downloaded;
      return new SuccessResponse({ kind: 'file', content: buffer.toString('utf8') });
    }

    const response = await streamCSVFile({
      storage,
      bucketName: gcsPath.bucketName,
      basePath,
      fullPath,
      safeFilePath,
      start,
      limit,
      workingDir,
      filePath,
    });

    return new SuccessResponse(response);
  } catch (error) {
    if (error instanceof ErrorResponse) {
      throw error;
    }
    logger.error(
      { error, workingDir, filePath, start, limit },
      'Failed to read file preview from GCS',
    );
    throw new ServerErrorResponse('Failed to read file preview');
  }
}

async function tryLoadCsvMeta(
  storage: ReturnType<typeof getStorageClient>,
  params: { bucketName: string; basePath: string; csvRelativePath: string },
): Promise<CsvMetaInfo> {
  const { bucketName, basePath, csvRelativePath } = params;
  const metaRelativePath = buildCsvMetaFilePath(csvRelativePath);
  const metaFullPath = `${basePath}/${metaRelativePath}`;

  try {
    const metaFile = storage.bucket(bucketName).file(metaFullPath);
    const downloaded = await metaFile.download();
    const buffer = Array.isArray(downloaded) ? downloaded[0] : downloaded;
    const parsed = JSON.parse(buffer.toString('utf8'));
    return extractCsvMetaInfo(parsed);
  } catch (error: any) {
    const code = error?.code;
    if (code === 404) {
      return { totalRows: null, sql: null };
    }
    logger.warn({ error, bucketName, metaFullPath }, 'Failed to read CSV meta file (ignored)');
    return { totalRows: null, sql: null };
  }
}

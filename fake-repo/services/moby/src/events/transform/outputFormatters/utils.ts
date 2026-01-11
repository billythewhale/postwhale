import { getStorageClient } from '@tw/utils/module/gcs';
import { logger } from '@tw/utils/module/logger';
import { getSecret } from '@tw/utils/module/secrets';

export function parsePythonRepr(output: string): Record<string, string> {
  const result: Record<string, string> = {};
  const regex = /(\w+)='([^']*)'/g;
  let match;
  while ((match = regex.exec(output)) !== null) {
    result[match[1]] = match[2];
  }
  return result;
}

export type GcsPath = {
  bucketName: string;
  basePath: string;
};

export function parseGcsUrl(gcsUrl: string): GcsPath | null {
  const match = gcsUrl.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (!match) {
    logger.warn({ gcsUrl }, 'Invalid GCS URL format');
    return null;
  }
  return {
    bucketName: match[1],
    basePath: match[2],
  };
}

export async function generateSignedUrl(params: {
  bucketName: string;
  fileName: string;
  msForExpiration?: number;
}): Promise<string> {
  const { bucketName, fileName, msForExpiration = 7200000 } = params; // 2 hours

  const storage = getStorageClient({
    forceCloud: true,
    storageOptions: {
      credentials: {
        private_key: getSecret('SERVICE_ACCOUNT_PRIVATE_KEY'),
        client_email: getSecret('SERVICE_ACCOUNT_EMAIL'),
      },
    },
  });

  const [url] = await storage
    .bucket(bucketName)
    .file(fileName)
    .getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + msForExpiration,
    });

  return url;
}

export type SignedFile = {
  filename: string;
  signedUrl: string;
};

export async function generateSignedUrlsForFiles(
  workingDir: string,
  filePaths: string[],
): Promise<SignedFile[]> {
  const gcsPath = parseGcsUrl(workingDir);
  if (!gcsPath) {
    return [];
  }

  const results: SignedFile[] = [];

  for (const filePath of filePaths) {
    try {
      const fullPath = `${gcsPath.basePath}/${filePath}`;
      const signedUrl = await generateSignedUrl({
        bucketName: gcsPath.bucketName,
        fileName: fullPath,
      });
      results.push({ filename: filePath, signedUrl });
    } catch (error: any) {
      logger.error({ error, filePath, workingDir }, 'Failed to generate signed URL');
    }
  }

  return results;
}

import { isStaging } from '@tw/constants';

const MOBY_BUCKET_STAGING = 'ai-moby-triple-whale-staging';
const MOBY_BUCKET_PROD = 'ai-moby-shofifi';

export function getMobySessionFilesBucketName(): string {
  return isStaging ? MOBY_BUCKET_STAGING : MOBY_BUCKET_PROD;
}

export function getEffectiveWorkingDir(params: {
  workingDir?: string;
  shopId?: string | null;
  sessionId?: string | null;
}): string | undefined {
  const { workingDir, shopId, sessionId } = params;

  if (workingDir) {
    return workingDir;
  }

  if (!shopId || !sessionId || sessionId === 'new') {
    return undefined;
  }

  return `gs://${getMobySessionFilesBucketName()}/session_files/${shopId}/${sessionId}`;
}

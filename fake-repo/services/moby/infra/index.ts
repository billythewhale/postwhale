import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';
import {
  deployToKnative,
  createServiceAccount,
  serviceInfraConfig,
  createSecret,
  createPostgresInstance,
  createPassword,
  getStackReference,
  getConfigs,
} from '@tw/pulumi';

const { projectId, location } = getConfigs();
const aiInfraRef = getStackReference('ai-infra', projectId);

const redis = new gcp.redis.Instance('redis', {
  name: 'moby-redis',
  memorySizeGb: 1,
  region: location,
  authorizedNetwork: 'app',
});

const { serviceAccount } = createServiceAccount({
  roles: ['roles/iam.serviceAccountTokenCreator'],
});

const serviceAccountKey = new gcp.serviceaccount.Key('moby-service-account-key', {
  serviceAccountId: serviceAccount.name,
  publicKeyType: 'TYPE_X509_PEM_FILE',
});

const privateKey = pulumi.secret(
  serviceAccountKey.privateKey.apply((key) => {
    const decoded = Buffer.from(key, 'base64').toString('utf-8');
    const json = JSON.parse(decoded);
    return json.private_key;
  }),
);

const secretValue = {
  REDIS_HOST: redis.host,
  SERVICE_ACCOUNT_EMAIL: serviceAccount.email,
  CHAT_SESSIONS_PG_URI: aiInfraRef.getOutput('chatSessionsPgUri'),
  SERVICE_ACCOUNT_PRIVATE_KEY: privateKey,
};

const { secretVersion } = createSecret(secretValue);

const { deployment } = deployToKnative({
  serviceAccount,
  createKnativeServingArgs: {
    secretVersion,
    minReplicas: 1,
  },
});

const { deployment: streamDeployment } = deployToKnative({
  serviceAccount,
  name: 'moby-stream',
  createKnativeServingArgs: {
    secretVersion,
    minReplicas: 1,
    timeoutSeconds: 3600,
  },
});

serviceInfraConfig({ apiGateway: { service: deployment }, devMode: true });

export const redisHost = redis.host;
export const redisAuthString = redis.authString;

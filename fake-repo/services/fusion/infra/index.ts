import { Input } from '@pulumi/pulumi';
import * as gcp from '@pulumi/gcp';
import {
  deployToKnative,
  createServiceAccount,
  serviceInfraConfig,
  createSecret,
  getSecretValue,
  getMongoDbConnectionString,
  createMongoDbUser,
  createPubsubSubscription,
  deploySaber,
  createQueue,
  getConfigs,
  getStackReference,
  isProduction,
  getK8sProvider,
  dragonflyOnK8s,
} from '@tw/pulumi';

const { location } = getConfigs();
const globalInfraRef = getStackReference(`infra`);

import * as CH from '@tw/pulumi/module/clickhouse';

const CH_CLUSTER = 'main'; // for now, probably want a fusion cluster eventually

// const backendDb = CH.createDb({
//   name: 'fusion_backend',
//   cluster: CH_CLUSTER,
//   comment: 'Database for storing customer data',
// });

// const publicDb = CH.createDb({
//   name: 'fusion_public',
//   cluster: CH_CLUSTER,
//   comment: 'Database for querying customer data',
// });

const mongodbUser = createMongoDbUser();

const redisDeployment = dragonflyOnK8s({
  provider: getK8sProvider({
    namespace: 'fusion-ns',
    cluster: 'sonic-cluster',
    createNamespace: true,
  }),
  name: 'data-in-redis',
  replicas: isProduction ? 2 : 1,
  computeSelector: {
    memoryRequest: '4Gi',
    CPURequest: isProduction ? 2 : 1,
  },
  prometheusScraping: true,
});

const secretValue = {
  REDIS_HOST: globalInfraRef.getOutput('multipurposeRedisInstanceHost'),
  FUSION_REDIS_HOST: redisDeployment.domain.fqdn,
  MONGODB_URL: getMongoDbConnectionString(mongodbUser, { clusterName: 'sonic-cluster' }),
  SHOPIFY_MONGO_URL: getMongoDbConnectionString(mongodbUser, {
    clusterName: 'shopify-cluster',
  }),
  CH_CLUSTER,
  // FUSION_BACKEND_DB: backendDb.name,
  // FUSION_PUBLIC_DB: publicDb.name,
};

const ASSESTS = [
  'orders',
  'customers',
  'ads',
  'products',
  'subscriptions',
  'pps',
  'shipping',
  'orders-enrichment',
  'products-enrichment',
];

for (const asset of ASSESTS) {
  const topic = new gcp.pubsub.Topic(`api-custom-${asset}`, {
    name: `api-custom-${asset}`,
  });

  createPubsubSubscription({
    name: `api-custom-${asset}-sub`,
    topicName: topic.name,
  });
}

const pixelPubSubTopic = new gcp.pubsub.Topic('new-custom-api-incoming', {
  name: 'new-custom-api-incoming',
});

createQueue('custom-api-integration-queue', {
  location,
  rateLimits: {
    maxConcurrentDispatches: 1,
    maxDispatchesPerSecond: 1 / 30,
  },
});

const { secretVersion } = createSecret(secretValue);

const { serviceAccount } = createServiceAccount();

const { deployment } = deployToKnative({
  serviceAccount,
  createKnativeServingArgs: {
    secretVersion,
    minReplicas: 2,
    metricType: 'concurrency',
    target: 10,
    podArgs: {
      computeSelector: {
        nodeFeatures: {
          datadog: true,
          otel: true,
        },
      },
    },
  },
});

const { deployment: bulkDeployment } = deployToKnative({
  name: 'bulk',
  serviceAccount,
  createKnativeServingArgs: {
    secretVersion,
    minReplicas: 2,
    metricType: 'concurrency',
    target: 5,
    podArgs: {
      computeSelector: {
        nodeFeatures: {
          datadog: true,
          otel: true,
        },
      },
    },
  },
});

deploySaber({
  serviceAccount,
  secretVersion,
  createK8sDeploymentArgs: {
    podArgs: { computeSelector: { nodeFeatures: { datadog: true } } },
    maxReplicas: 400,
  },
  excludeSaberPipelines: ['api-custom-orders-pipeline'],
});

deploySaber({
  serviceAccount,
  secretVersion,
  concurrencyLimit: 80,
  createK8sDeploymentArgs: {
    podArgs: { computeSelector: { nodeFeatures: { datadog: true } } },
    maxReplicas: 400,
    averageCPUUtilization: 10,
    name: 'fusion-saber-orders',
  },
  saberPipelines: ['api-custom-orders-pipeline'],
});

serviceInfraConfig({ apiGateway: { service: deployment } });

// Comenta SaaS — infraestrutura no Azure (Bicep)
// Escopo: resource group. Provisiona Postgres, Redis, Storage (site estático),
// Log Analytics, Container Apps Environment e o Container App da API.
//
// As partes imperativas (build da imagem com `az acr build`, habilitar o site
// estático e publicar o painel) ficam no wrapper deploy-bicep.sh — build de
// imagem e upload de blobs são operações de data-plane, não declarativas.

@description('Região dos recursos.')
param location string = resourceGroup().location

@description('Sufixo para nomes globalmente únicos (ex.: ab12cd).')
param suffix string

@description('Usuário administrador do PostgreSQL.')
param pgAdmin string = 'comentaadmin'

@secure()
@description('Senha do administrador do PostgreSQL.')
param pgPassword string

@secure()
@description('JWT_SECRET da API.')
param jwtSecret string

@secure()
@description('JWT_REFRESH_SECRET da API.')
param jwtRefreshSecret string

@secure()
@description('Chave da API Anthropic (opcional; vazia = endpoints /ai respondem 503).')
param anthropicApiKey string = ''

@description('Login server do ACR (ex.: comentaacrab12cd.azurecr.io).')
param acrLoginServer string

@description('Usuário do ACR.')
param acrUsername string

@secure()
@description('Senha do ACR.')
param acrPassword string

@description('Referência completa da imagem da API (ex.: <acr>/comenta-api:latest).')
param apiImage string

var pgServerName = 'comenta-pg-${suffix}'
var redisName = 'comenta-redis-${suffix}'
var storageName = 'comentaweb${suffix}'
var lawName = 'comenta-law-${suffix}'
var envName = 'comenta-env'
var appName = 'comenta-api'
var pgDbName = 'comenta_saas'

// ─── PostgreSQL Flexible Server (SSL obrigatório) ───────────────────────────
resource pg 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: pgServerName
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: pgAdmin
    administratorLoginPassword: pgPassword
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
    authConfig: {
      passwordAuth: 'Enabled'
      activeDirectoryAuth: 'Disabled'
    }
  }
}

resource pgDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: pg
  name: pgDbName
}

// Libera acesso dos serviços do Azure (Container Apps egress usa IPs Azure)
resource pgFirewall 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  parent: pg
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// ─── Azure Cache for Redis (TLS na 6380) ────────────────────────────────────
resource redis 'Microsoft.Cache/redis@2024-03-01' = {
  name: redisName
  location: location
  properties: {
    sku: {
      name: 'Basic'
      family: 'C'
      capacity: 0
    }
    minimumTlsVersion: '1.2'
    enableNonSslPort: false
  }
}

// ─── Storage account (site estático do painel) ──────────────────────────────
resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: true
    minimumTlsVersion: 'TLS1_2'
  }
}

// endpoint do site estático (vem com barra final; removida para uso em CORS)
var webEndpoint = storage.properties.primaryEndpoints.web
var webUrl = substring(webEndpoint, 0, length(webEndpoint) - 1)

// ─── Log Analytics (exigido pelo Container Apps Environment) ─────────────────
resource law 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: lawName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// ─── Container Apps Environment ─────────────────────────────────────────────
resource env 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: envName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: law.properties.customerId
        sharedKey: law.listKeys().primarySharedKey
      }
    }
  }
}

// Connection strings montadas a partir dos recursos (chaves URL-encoded)
var databaseUrl = 'postgresql://${pgAdmin}:${uriComponent(pgPassword)}@${pg.properties.fullyQualifiedDomainName}:5432/${pgDbName}?sslmode=require'
var redisUrl = 'rediss://:${uriComponent(redis.listKeys().primaryKey)}@${redis.properties.hostName}:6380'
// FQDN da API é determinístico: <app>.<defaultDomain do environment>
var apiUrl = 'https://${appName}.${env.properties.defaultDomain}'

// ─── Container App (API) ────────────────────────────────────────────────────
resource app 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  properties: {
    managedEnvironmentId: env.id
    configuration: {
      ingress: {
        external: true
        targetPort: 4000
        transport: 'auto'
        // Socket.IO com múltiplas réplicas precisa de afinidade de sessão
        stickySessions: {
          affinity: 'sticky'
        }
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
      registries: [
        {
          server: acrLoginServer
          username: acrUsername
          passwordSecretRef: 'acr-pwd'
        }
      ]
      secrets: [
        {
          name: 'acr-pwd'
          value: acrPassword
        }
        {
          name: 'db-url'
          value: databaseUrl
        }
        {
          name: 'redis-url'
          value: redisUrl
        }
        {
          name: 'jwt-secret'
          value: jwtSecret
        }
        {
          name: 'jwt-refresh'
          value: jwtRefreshSecret
        }
        {
          name: 'anthropic-key'
          value: anthropicApiKey
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: apiImage
          resources: {
            cpu: json('0.5')
            memory: '1.0Gi'
          }
          // espelha o docker-compose: migra o schema, roda o seed (idempotente)
          // e sobe o servidor
          command: [
            '/bin/sh'
          ]
          args: [
            '-c'
            'npx drizzle-kit push --force && npx tsx src/db/seed.ts && npx tsx src/index.ts'
          ]
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'PORT'
              value: '4000'
            }
            {
              name: 'APP_URL'
              value: webUrl
            }
            {
              name: 'API_URL'
              value: apiUrl
            }
            {
              name: 'CORS_ORIGINS'
              value: webUrl
            }
            {
              name: 'DATABASE_URL'
              secretRef: 'db-url'
            }
            {
              name: 'REDIS_URL'
              secretRef: 'redis-url'
            }
            {
              name: 'JWT_SECRET'
              secretRef: 'jwt-secret'
            }
            {
              name: 'JWT_REFRESH_SECRET'
              secretRef: 'jwt-refresh'
            }
            {
              name: 'ANTHROPIC_API_KEY'
              secretRef: 'anthropic-key'
            }
            {
              name: 'AI_MODEL_CLASSIFY'
              value: 'claude-haiku-4-5'
            }
            {
              name: 'AI_MODEL_SUMMARIZE'
              value: 'claude-haiku-4-5'
            }
            {
              name: 'AI_MODEL_SUGGEST'
              value: 'claude-sonnet-5'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
}

output apiUrl string = 'https://${app.properties.configuration.ingress.fqdn}'
output apiFqdn string = app.properties.configuration.ingress.fqdn
output webUrl string = webUrl
output storageName string = storageName
output pgHost string = pg.properties.fullyQualifiedDomainName
output redisHost string = redis.properties.hostName

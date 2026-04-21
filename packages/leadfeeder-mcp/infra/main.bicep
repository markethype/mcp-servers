targetScope = 'resourceGroup'

@description('azd environment name, used for tagging')
param environmentName string

@description('Azure region')
param location string

@secure()
param leadfeederApiKey string

@secure()
param mcpAuthToken string

@description('Container image tag (azd overrides at deploy time)')
param imageTag string = 'latest'

var resourceToken = uniqueString(subscription().id, resourceGroup().id, environmentName)
var commonTags = {
  'azd-env-name': environmentName
}
var containerAppTags = union(commonTags, {
  'azd-service-name': 'leadfeeder-mcp'
})

resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'log-${resourceToken}'
  location: location
  tags: commonTags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'id-${resourceToken}'
  location: location
  tags: commonTags
}

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: 'acr${replace(resourceToken, '-', '')}'
  location: location
  tags: commonTags
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false
  }
}

resource acrPullRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acr.id, managedIdentity.id, 'AcrPull')
  scope: acr
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
    principalId: managedIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'cae-${resourceToken}'
  location: location
  tags: commonTags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsWorkspace.properties.customerId
        sharedKey: logAnalyticsWorkspace.listKeys().primarySharedKey
      }
    }
  }
}

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-leadfeeder-${resourceToken}'
  location: location
  tags: containerAppTags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerAppsEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
        allowInsecure: false
      }
      registries: [
        {
          server: acr.properties.loginServer
          identity: managedIdentity.id
        }
      ]
      secrets: [
        {
          name: 'leadfeeder-api-key'
          value: leadfeederApiKey
        }
        {
          name: 'mcp-auth-token'
          value: mcpAuthToken
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'leadfeeder-mcp'
          image: '${acr.properties.loginServer}/leadfeeder-mcp:${imageTag}'
          resources: {
            cpu: json('0.5')
            memory: '1.0Gi'
          }
          env: [
            {
              name: 'MCP_TRANSPORT'
              value: 'http'
            }
            {
              name: 'PORT'
              value: '3000'
            }
            {
              name: 'LOG_LEVEL'
              value: 'info'
            }
            {
              name: 'LEADFEEDER_API_KEY'
              secretRef: 'leadfeeder-api-key'
            }
            {
              name: 'MCP_AUTH_TOKEN'
              secretRef: 'mcp-auth-token'
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/health'
                port: 3000
              }
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/health'
                port: 3000
              }
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 3
        rules: [
          {
            name: 'http-concurrent'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
  dependsOn: [
    acrPullRole
  ]
}

output AZURE_CONTAINER_REGISTRY_ENDPOINT string = acr.properties.loginServer
output AZURE_CONTAINER_REGISTRY_NAME string = acr.name
output SERVICE_LEADFEEDER_MCP_ENDPOINT_URL string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
output RESOURCE_GROUP_ID string = resourceGroup().id
output AZURE_CONTAINER_APPS_ENVIRONMENT_ID string = containerAppsEnvironment.id

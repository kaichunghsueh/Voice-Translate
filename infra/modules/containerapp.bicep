param environmentName string
param appName string
param location string
param tags object

param logAnalyticsCustomerId string
@secure()
param logAnalyticsSharedKey string

param userAssignedIdentityResourceId string
param userAssignedIdentityClientId string
param containerRegistryLoginServer string

@secure()
param appInsightsConnectionString string

param aiServicesEndpoint string
param aiServicesResourceId string
param foundryProjectEndpoint string
param gptDeploymentName string

@description('Placeholder image used on first provision; azd deploy replaces it.')
param containerImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

param minReplicas int = 1
param maxReplicas int = 5

resource env 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: environmentName
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsCustomerId
        sharedKey: logAnalyticsSharedKey
      }
    }
    zoneRedundant: false
  }
}

resource app 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  tags: union(tags, {
    'azd-service-name': 'web'
  })
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userAssignedIdentityResourceId}': {}
    }
  }
  properties: {
    managedEnvironmentId: env.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
        allowInsecure: false
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
      registries: [
        {
          server: containerRegistryLoginServer
          identity: userAssignedIdentityResourceId
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'web'
          image: containerImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            { name: 'AZURE_CLIENT_ID',                 value: userAssignedIdentityClientId }
            { name: 'AZURE_AISERVICES_ENDPOINT',       value: aiServicesEndpoint }
            { name: 'AZURE_AISERVICES_RESOURCE_ID',    value: aiServicesResourceId }
            { name: 'AZURE_FOUNDRY_PROJECT_ENDPOINT',  value: foundryProjectEndpoint }
            { name: 'AZURE_GPT_DEPLOYMENT',            value: gptDeploymentName }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsightsConnectionString }
            { name: 'TTS_DEFAULT_VOICE', value: 'zh-TW-HsiaoChenNeural' }
            { name: 'TTS_REGION', value: location }
            { name: 'NODE_ENV', value: 'production' }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: { path: '/api/health', port: 3000 }
              initialDelaySeconds: 10
              periodSeconds: 30
            }
            {
              type: 'Readiness'
              httpGet: { path: '/api/health', port: 3000 }
              initialDelaySeconds: 5
              periodSeconds: 10
            }
          ]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'http-scale'
            http: {
              metadata: {
                concurrentRequests: '30'
              }
            }
          }
        ]
      }
    }
  }
}

output id string = app.id
output name string = app.name
output fqdn string = app.properties.configuration.ingress.fqdn

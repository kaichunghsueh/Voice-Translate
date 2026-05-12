targetScope = 'subscription'

@minLength(2)
@maxLength(16)
@description('Short environment name used to derive resource names (lowercase letters/digits).')
param environmentName string

@description('Primary Azure region. westus3 is required for Speech DragonHD GA + gpt-5-mini availability.')
@allowed([
  'westus3'
  'eastus2'
  'southeastasia'
])
param location string = 'westus3'

@description('Object ID of the developer principal granted data-plane roles for local debugging. Empty string skips.')
param principalId string = ''

@description('Monthly budget in USD for the resource group.')
param budgetAmount int = 100

@description('Email addresses notified when budget thresholds are crossed.')
param budgetContactEmails array = [
  'kevinhs@microsoft.com'
]

var tags = {
  'azd-env-name': environmentName
  workload: 'voice-translate'
  region: location
}

var token = uniqueString(subscription().id, environmentName, location)
var regionSuffix = take(replace(replace(location, 'us', 'us'), ' ', ''), 8)

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: 'rg-${environmentName}-${regionSuffix}'
  location: location
  tags: tags
}

module identity 'modules/identity.bicep' = {
  scope: rg
  params: {
    name: 'id-${environmentName}-${regionSuffix}'
    location: location
    tags: tags
  }
}

module observability 'modules/observability.bicep' = {
  scope: rg
  params: {
    logAnalyticsName: 'log-${environmentName}-${regionSuffix}'
    appInsightsName: 'appi-${environmentName}-${regionSuffix}'
    location: location
    tags: tags
  }
}

module foundry 'modules/foundry.bicep' = {
  scope: rg
  params: {
    aiServicesName: 'ais-${environmentName}-${regionSuffix}-${take(token, 4)}'
    hubName: 'fh-${environmentName}-${regionSuffix}'
    projectName: 'fp-${environmentName}-${regionSuffix}'
    location: location
    tags: tags
    userAssignedIdentityPrincipalId: identity.outputs.principalId
    userAssignedIdentityResourceId: identity.outputs.resourceId
    developerPrincipalId: principalId
    appInsightsResourceId: observability.outputs.appInsightsId
  }
}

module registry 'modules/containerregistry.bicep' = {
  scope: rg
  params: {
    name: 'cr${environmentName}${regionSuffix}${take(token, 4)}'
    location: location
    tags: tags
    userAssignedIdentityPrincipalId: identity.outputs.principalId
  }
}

module app 'modules/containerapp.bicep' = {
  scope: rg
  params: {
    environmentName: 'cae-${environmentName}-${regionSuffix}'
    appName: 'ca-${environmentName}-web'
    location: location
    tags: tags
    logAnalyticsCustomerId: observability.outputs.logAnalyticsCustomerId
    logAnalyticsSharedKey: observability.outputs.logAnalyticsPrimaryKey
    userAssignedIdentityResourceId: identity.outputs.resourceId
    userAssignedIdentityClientId: identity.outputs.clientId
    containerRegistryLoginServer: registry.outputs.loginServer
    appInsightsConnectionString: observability.outputs.appInsightsConnectionString
    aiServicesEndpoint: foundry.outputs.aiServicesEndpoint
    aiServicesResourceId: foundry.outputs.aiServicesId
    foundryProjectEndpoint: foundry.outputs.projectEndpoint
    gptDeploymentName: foundry.outputs.gptDeploymentName
  }
}

resource budget 'Microsoft.Consumption/budgets@2024-08-01' = {
  name: 'budget-${environmentName}'
  properties: {
    category: 'Cost'
    amount: budgetAmount
    timeGrain: 'Monthly'
    timePeriod: {
      startDate: '2026-05-01'
    }
    filter: {
      dimensions: {
        name: 'ResourceGroupName'
        operator: 'In'
        values: [
          rg.name
        ]
      }
    }
    notifications: {
      Actual_50: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 50
        contactEmails: budgetContactEmails
        thresholdType: 'Actual'
      }
      Actual_80: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 80
        contactEmails: budgetContactEmails
        thresholdType: 'Actual'
      }
      Forecasted_100: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 100
        contactEmails: budgetContactEmails
        thresholdType: 'Forecasted'
      }
    }
  }
}

output AZURE_LOCATION string = location
output AZURE_RESOURCE_GROUP string = rg.name
output AZURE_AISERVICES_ENDPOINT string = foundry.outputs.aiServicesEndpoint
output AZURE_AISERVICES_RESOURCE_ID string = foundry.outputs.aiServicesId
output AZURE_FOUNDRY_PROJECT_ENDPOINT string = foundry.outputs.projectEndpoint
output AZURE_GPT_DEPLOYMENT string = foundry.outputs.gptDeploymentName
output AZURE_CLIENT_ID string = identity.outputs.clientId
output AZURE_CONTAINER_APP_FQDN string = app.outputs.fqdn
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = registry.outputs.loginServer
output APPLICATIONINSIGHTS_CONNECTION_STRING string = observability.outputs.appInsightsConnectionString

using './main.bicep'

param environmentName = readEnvironmentVariable('AZURE_ENV_NAME', 'voicetw')
param location = readEnvironmentVariable('AZURE_LOCATION', 'westus3')
param principalId = readEnvironmentVariable('AZURE_PRINCIPAL_ID', '')
param budgetAmount = 100

import { getConfig } from 'config'

export type Flag = typeof FeatureFlag[keyof typeof FeatureFlag]

export const FeatureFlag = {
  Yearn: getConfig().REACT_APP_FEATURE_YEARN,
  CosmosInvestor: getConfig().REACT_APP_FEATURE_COSMOS_INVESTOR,
  Plugin: {
    Bitcoin: getConfig().REACT_APP_FEATURE_PLUGIN_BITCOIN,
    Cosmos: getConfig().REACT_APP_FEATURE_PLUGIN_COSMOS
  }
}

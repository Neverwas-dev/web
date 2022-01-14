import { CAIP19 } from '@shapeshiftoss/caip'
import { Text } from 'components/Text'
import { selectAssetByCAIP19 } from 'state/slices/assetsSlice/assetsSlice'
import {
  AccountSpecifier,
  selectPortfolioAssetIdsByAccountIdExcludeFeeAsset
} from 'state/slices/portfolioSlice/portfolioSlice'
import { useAppSelector } from 'state/store'

import { Card } from '../Card/Card'
import { AccountAssetsList } from './AccountAssetsList'

export const AccountAssets = ({
  assetId,
  accountId
}: {
  assetId: CAIP19
  accountId: AccountSpecifier
}) => {
  const assetIds = useAppSelector(state =>
    selectPortfolioAssetIdsByAccountIdExcludeFeeAsset(state, accountId)
  )
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))

  // @TODO: This filters for ETH to not show tokens component on tokens
  if (asset.tokenId || assetIds.length === 0) return null

  return (
    <Card>
      <Card.Header>
        <Card.Heading>
          <Text translation='assets.assetCards.accountTokens' />
        </Card.Heading>
      </Card.Header>
      <Card.Body pt={0}>
        <AccountAssetsList accountId={accountId} assetIds={assetIds} limit={5} />
      </Card.Body>
    </Card>
  )
}
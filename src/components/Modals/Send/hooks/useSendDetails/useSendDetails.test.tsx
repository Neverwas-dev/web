import { getMarketData } from '@shapeshiftoss/market-service'
import { ChainAdapters, ChainTypes } from '@shapeshiftoss/types'
import { act, renderHook } from '@testing-library/react-hooks'
import { useFormContext, useWatch } from 'react-hook-form'
import { useHistory } from 'react-router-dom'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useGetAssetData } from 'hooks/useAsset/useAsset'
import { TestProviders } from 'jest/TestProviders'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { useAccountBalances } from '../useAccountBalances/useAccountBalances'
import { useSendDetails } from './useSendDetails'

jest.mock('@shapeshiftoss/market-service')
jest.mock('react-hook-form')
jest.mock('react-router-dom', () => ({ useHistory: jest.fn() }))
jest.mock('components/Modals/Send/hooks/useAccountBalances/useAccountBalances')
jest.mock('context/WalletProvider/WalletProvider')
jest.mock('context/ChainAdaptersProvider/ChainAdaptersProvider')
jest.mock('hooks/useAsset/useAsset')
// jest.mock('hooks/useBalances/useFlattenedBalances')

const balances = {
  ethereum: {
    network: 'ethereum',
    symbol: 'ETH',
    address: '0x0000000000000000000000000000000000000000',
    balance: '5000000000000000000',
    unconfirmedBalance: '0',
    unconfirmedTxs: 0,
    txs: 198,
    tokens: [
      {
        type: 'ERC20',
        name: 'THORChain ETH.RUNE',
        contract: '0x3155BA85D5F96b2d030a4966AF206230e46849cb',
        transfers: 10,
        symbol: 'RUNE',
        decimals: 18,
        balance: '21000000000000000000'
      }
    ]
  },
  '0x3155ba85d5f96b2d030a4966af206230e46849cb': {
    type: 'ERC20',
    name: 'THORChain ETH.RUNE',
    contract: '0x3155BA85D5F96b2d030a4966AF206230e46849cb',
    transfers: 10,
    symbol: 'RUNE',
    decimals: 18,
    balance: '21000000000000000000'
  }
}

const ethAsset = {
  name: 'Ethereum',
  network: 'ethereum',
  price: 3500,
  symbol: 'eth',
  precision: 18
}

const erc20RuneAsset = {
  tokenId: '0x3155ba85d5f96b2d030a4966af206230e46849cb',
  name: 'THORChain (ERC20)',
  network: 'ethereum',
  price: 10,
  symbol: 'rune',
  precision: 18
}

const estimatedFees = {
  [ChainAdapters.FeeDataKey.Fast]: {
    networkFee: '6000000000000000'
  }
}

const getEthAccountBalances = () => {
  const crypto = bnOrZero(balances.ethereum.balance).div('1e18')
  const fiat = crypto.times(ethAsset.price)
  return {
    crypto,
    fiat
  }
}

const getRuneAccountBalances = () => {
  const crypto = bnOrZero(balances['0x3155ba85d5f96b2d030a4966af206230e46849cb'].balance).div(
    '1e18'
  )
  const fiat = crypto.times(erc20RuneAsset.price)
  return {
    crypto,
    fiat
  }
}

const getAssetData = () =>
  Promise.resolve({
    name: 'Ethereum',
    chain: ChainTypes.Ethereum,
    price: '3500',
    symbol: 'ETH',
    precision: 18
  })

const setup = ({
  asset = ethAsset,
  assetBalance = {},
  accountBalances = {},
  balanceError = null,
  formErrors = {},
  setError = jest.fn(),
  setValue = jest.fn()
}) => {
  ;(useGetAssetData as jest.Mock<unknown>).mockImplementation(() => getAssetData)
  ;(useWatch as jest.Mock<unknown>).mockImplementation(() => [
    asset,
    '0x3155BA85D5F96b2d030a4966AF206230e46849cb'
  ])
  ;(useAccountBalances as jest.Mock<unknown>).mockImplementation(() => ({
    assetBalance,
    accountBalances
  }))
  // ;(useFlattenedBalances as jest.Mock<unknown>).mockImplementation(() => ({
  //   balances,
  //   error: balanceError,
  //   loading: false
  // }))
  ;(useFormContext as jest.Mock<unknown>).mockImplementation(() => ({
    clearErrors: jest.fn(),
    setError,
    setValue,
    formState: { errors: formErrors },
    getValues: () => ({
      crypto: { amount: '1' },
      asset
    })
  }))

  const wrapper: React.FC = ({ children }) => <TestProviders>{children}</TestProviders>
  return renderHook(() => useSendDetails(), { wrapper })
}

describe.skip('useSendDetails', () => {
  beforeEach(() => {
    ;(useWallet as jest.Mock<unknown>).mockImplementation(() => ({ state: { wallet: {} } }))
    ;(useHistory as jest.Mock<unknown>).mockImplementation(() => ({ push: jest.fn() }))
    ;(useChainAdapters as jest.Mock<unknown>).mockImplementation(() => ({
      byChain: () => ({
        getAddress: () => '0xMyWalletsAddress',
        getFeeData: () => estimatedFees,
        buildSendTransaction: () => ({
          txToSign: {},
          estimatedFees
        })
      })
    }))
    ;(getMarketData as jest.Mock<unknown>).mockImplementation(() => ({
      price: 3500,
      network: 'ethereum'
    }))
  })

  it('returns the default useSendDetails state', async () => {
    return await act(async () => {
      const { result } = setup({
        assetBalance: balances.ethereum,
        accountBalances: getEthAccountBalances()
      })
      expect(result.current.amountFieldError).toBe(null)
      expect(result.current.balancesLoading).toBe(false)
      expect(result.current.fieldName).toBe('fiatAmount')
      expect(result.current.loading).toBe(false)
    })
  })

  it('toggles the input field', async () => {
    return await act(async () => {
      const { waitForValueToChange, result } = setup({
        assetBalance: balances.ethereum,
        accountBalances: getEthAccountBalances()
      })
      expect(result.current.fieldName).toBe('fiatAmount')
      act(() => {
        result.current.toggleCurrency()
      })
      await waitForValueToChange(() => result.current.fieldName)
      expect(result.current.fieldName).toBe('cryptoAmount')
    })
  })

  it('toggles the amount input error to the fiatAmount/cryptoAmount field', async () => {
    return await act(async () => {
      let setError = jest.fn()
      const { waitForValueToChange, result } = setup({
        assetBalance: balances.ethereum,
        accountBalances: getEthAccountBalances(),
        formErrors: {
          fiat: { amount: { message: 'common.insufficientFunds' } }
        },
        setError
      })

      act(() => {
        result.current.toggleCurrency()
      })

      await waitForValueToChange(() => result.current.fieldName)

      expect(result.current.fieldName).toBe('cryptoAmount')
      expect(setError).toHaveBeenCalledWith('cryptoAmount', {
        message: 'common.insufficientFunds'
      })
    })
  })

  it('handles input change on fiatAmount', async () => {
    const setValue = jest.fn()
    await act(async () => {
      const { waitForValueToChange, result } = setup({
        assetBalance: balances.ethereum,
        accountBalances: getEthAccountBalances(),
        setValue
      })
      // Field is set to fiatAmount
      expect(result.current.fieldName).toBe('fiatAmount')

      // Set fiat amount
      act(() => {
        result.current.handleInputChange('3500')
        expect(setValue).toHaveBeenCalledWith('cryptoAmount', '1')
        setValue.mockClear()

        result.current.handleInputChange('0')
        expect(setValue).toHaveBeenCalledWith('cryptoAmount', '0')
        setValue.mockClear()
      })

      // toggle field to cryptoAmount
      act(() => {
        result.current.toggleCurrency()
      })
      await waitForValueToChange(() => result.current.fieldName)
      expect(result.current.fieldName).toBe('cryptoAmount')

      // Set crypto amount
      act(() => {
        result.current.handleInputChange('1')
        expect(setValue).toHaveBeenCalledWith('fiatAmount', '3500')
        setValue.mockClear()
      })
    })
  })

  it('validates the fiat amount', async () => {
    return await act(async () => {
      const { result } = setup({
        assetBalance: balances.ethereum,
        accountBalances: getEthAccountBalances()
      })
      act(() => {
        const valid = result.current.validateFiatAmount('100')
        expect(valid).toBe(true)

        const notValid = result.current.validateFiatAmount('100000000000000')
        expect(notValid).toBe('common.insufficientFunds')
      })
    })
  })

  it('validates the crypto amount', async () => {
    return await act(async () => {
      const { result } = setup({
        assetBalance: balances.ethereum,
        accountBalances: getEthAccountBalances()
      })
      act(() => {
        const valid = result.current.validateCryptoAmount('.0001')
        expect(valid).toBe(true)

        const notValid = result.current.validateCryptoAmount('10')
        expect(notValid).toBe('common.insufficientFunds')
      })
    })
  })

  it('handles setting up send max for network asset', async () => {
    const setValue = jest.fn()
    return await act(async () => {
      const { result } = setup({
        assetBalance: balances.ethereum,
        accountBalances: getEthAccountBalances(),
        setValue
      })
      await act(async () => {
        await result.current.handleSendMax()
        expect(setValue).toHaveBeenNthCalledWith(1, 'cryptoAmount', '4.994')
        expect(setValue).toHaveBeenNthCalledWith(2, 'fiatAmount', '17479.00')
      })
    })
  })

  it('handles setting up send max for erc20', async () => {
    const setValue = jest.fn()
    return await act(async () => {
      const { result } = setup({
        asset: erc20RuneAsset,
        assetBalance: balances['0x3155ba85d5f96b2d030a4966af206230e46849cb'],
        accountBalances: getRuneAccountBalances(),
        setValue
      })
      await act(async () => {
        await result.current.handleSendMax()
        expect(setValue).toHaveBeenNthCalledWith(1, 'cryptoAmount', '21')
        expect(setValue).toHaveBeenNthCalledWith(2, 'fiatAmount', '210.00')
      })
    })
  })

  it('handles building tx by clicking next', async () => {
    const setValue = jest.fn()
    return await act(async () => {
      const { result } = setup({
        assetBalance: balances.ethereum,
        accountBalances: getEthAccountBalances(),
        setValue
      })
      await act(async () => {
        await result.current.handleNextClick()
        expect(setValue).toHaveBeenNthCalledWith(1, 'transaction', {})
        expect(setValue).toHaveBeenNthCalledWith(2, 'estimatedFees', estimatedFees)
      })
    })
  })
})

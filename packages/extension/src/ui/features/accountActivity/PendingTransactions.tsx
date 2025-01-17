import { HeaderCell } from "@argent/ui"
import { Center, Flex } from "@chakra-ui/react"
import { FC } from "react"

import { Network } from "../../../shared/network"
import { Token } from "../../../shared/token/type"
import { Transaction } from "../../../shared/transactions"
import { BaseWalletAccount } from "../../../shared/wallet.model"
import { useAppState } from "../../app.state"
import { openBlockExplorerTransaction, openExplorerTransaction } from "../../services/blockExplorer.service"
import { useAccountTransactions } from "../accounts/accountTransactions.state"
import { useTokensWithBalance } from "../accountTokens/tokens.state"
import { useCurrentNetwork, useNetwork } from "../networks/useNetworks"
import { ReviewedTransactionListItem, TransactionListItem } from "./TransactionListItem"
import { transformTransaction } from "./transform"
import { transformReviewedTransaction } from "./transform/transaction/transformTransaction"

interface PendingTransactionsContainerProps {
  account: BaseWalletAccount
}

export const PendingTransactionsContainer: FC<
  PendingTransactionsContainerProps
> = ({ account }) => {
  const network = useCurrentNetwork()
  const { pendingTransactions } = useAccountTransactions(account)
  const { switcherNetworkId } = useAppState()
  const tokensByNetwork = useTokensWithBalance(account)

  return (
    <PendingTransactions
      pendingTransactions={pendingTransactions}
      network={network}
      tokensByNetwork={tokensByNetwork.tokenDetails}
      accountAddress={account.address}
    />
  )
}

interface PendingTransactionsProps {
  pendingTransactions: Transaction[]
  network: Network
  tokensByNetwork?: Token[]
  accountAddress: string
}

export const PendingTransactions: FC<PendingTransactionsProps> = ({
  pendingTransactions,
  network,
  tokensByNetwork,
  accountAddress,
}) => {
  if (!pendingTransactions.length) {
    return null
  }

  return (
    <>
      <HeaderCell>
        <Flex alignItems={"center"} gap={1}>
          Pending transactions
          <Center
            color={"neutrals.900"}
            backgroundColor={"skyBlue.500"}
            rounded={"full"}
            height={4}
            minWidth={4}
            fontWeight={"extrabold"}
            fontSize={"2xs"}
            px={0.5}
          >
            {pendingTransactions.length}
          </Center>
        </Flex>
      </HeaderCell>
      {pendingTransactions.map((transaction) => {
        const reviewedTransaction = transaction.meta?.request
        if (!reviewedTransaction) {
          return null
        }
        const transactionTransformed = transformReviewedTransaction(reviewedTransaction)
        if (transactionTransformed) {
          const { hash } = transaction
          return (
            <ReviewedTransactionListItem
              key={hash}
              transactionTransformed={transactionTransformed}
              networkId={network.id}
              onClick={() => network.explorerUrl && openExplorerTransaction(network.explorerUrl, hash)}
            />
          )
        }
        return null
      })}
    </>
  )
}

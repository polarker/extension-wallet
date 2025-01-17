import { memoize } from "lodash-es"
import { useMemo } from "react"

import { transactionsStore } from "../../../background/transactions/store"
import { useArrayStorage } from "../../../shared/storage/hooks"
import { Transaction, Status as DetailedStatus } from "../../../shared/transactions"

function transformStatus(status: DetailedStatus): Status {
  return ["ACCEPTED_ON_CHAIN", "ACCEPTED_ON_L2", "PENDING"].includes(status)
    ? "SUCCESS"
    : status === "REJECTED"
    ? "ERROR"
    : "PENDING"
}

type Status = "UNKNOWN" | "PENDING" | "SUCCESS" | "ERROR"

const transactionSelector = memoize(
  (hash?: string, networkId?: string) => (transaction: Transaction) =>
    transaction.hash === hash && transaction.account.networkId === networkId,
  (hash, networkId) => `${hash}-${networkId}`,
)

export const useTransactionStatus = (
  transactionHash?: string,
  networkId?: string,
): Status => {
  const [transaction] = useArrayStorage(
    transactionsStore,
    transactionSelector(transactionHash, networkId),
  )

  return useMemo(() => {
    if (!transaction?.status) {
      return "UNKNOWN"
    }
    return transformStatus(transaction.status)
  }, [transaction?.status])
}

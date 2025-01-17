import {
  ReviewTransactionResult,
} from "../../shared/actionQueue/types"
import { BackgroundService } from "../background"
import { addTransaction } from "./store"

export const executeTransactionAction = async (
  transaction: ReviewTransactionResult,
  { wallet }: BackgroundService,
  networkId: string,
) => {
  const account = await wallet.getAccount({
    address: transaction.params.signerAddress,
    networkId: networkId,
  })
  await wallet.signAndSubmitUnsignedTx(account, {
    signerAddress: account.address,
    unsignedTx: transaction.result.unsignedTx,
  })

  if (account !== undefined) {
    addTransaction({
      account: account,
      hash: transaction.result.txId,
      meta: {
        request: transaction
      }
    })
  }
}

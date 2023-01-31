import { FC, useEffect, useState } from "react"
import { convertSetToAlph } from "@alephium/sdk"
import Select from 'react-select';
import { getAlephium } from '@alephium/get-extension-wallet'
import {
  getAlphBalance,
  getTokenBalances,
  mintToken,
  TokenBalance,
  transferToken,
  withdrawMintedToken
} from "../services/token.service"
import {
  getExplorerBaseUrl,
  networkId,
  signMessage,
} from "../services/wallet.service"
import styles from "../styles/Home.module.css"
import { SubscribeOptions, subscribeToTxStatus, TxStatusSubscription, TxStatus, web3 } from "@alephium/web3"

type Status = "idle" | "approve" | "pending" | "success" | "failure"

export const TokenDapp: FC<{
  address: string
}> = ({ address }) => {
  const [mintAmount, setMintAmount] = useState("10")
  const [transferTo, setTransferTo] = useState("")
  const [transferAmount, setTransferAmount] = useState("")
  const [shortText, setShortText] = useState("")
  const [lastSig, setLastSig] = useState<string[]>([])
  const [lastTransactionHash, setLastTransactionHash] = useState("")
  const [transactionStatus, setTransactionStatus] = useState<Status>("idle")
  const [transactionError, setTransactionError] = useState("")
  const [transferTokenAddress, setTransferTokenAddress] = useState("")
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([])
  const [alphBalance, setAlphBalance] = useState<{ balance: string, lockedBalance: string } | undefined>()
  const [mintedToken, setMintedToken] = useState<string | undefined>()
  const [transferingMintedToken, setTransferingMintedToken] = useState<boolean>(false)
  const [selectedTokenBalance, setSelectedTokenBalance] = useState<{ value: TokenBalance, label: string } | undefined>()

  const alephium = getAlephium()

  const buttonsDisabled = ["approve", "pending"].includes(transactionStatus)

  const resetMintToken = () => {
    setMintedToken(undefined)
    setMintAmount("10")
    setTransferingMintedToken(false)
  }

  useEffect(() => {
    getTokenBalances(address).then(tokenBalances => {
      if (tokenBalances.length > 0) {
        setSelectedTokenBalance({ value: tokenBalances[0], label: tokenBalances[0].id })
      }
      setTokenBalances(tokenBalances)
    })

    getAlphBalance(address).then(alphBalance => {
      setAlphBalance(alphBalance)
    })
  }, [address])

  useEffect(() => {
    ; (async () => {
      if (lastTransactionHash && transactionStatus === "pending") {
        setTransactionError("")

        if (alephium?.nodeProvider) {
          let subscription: TxStatusSubscription | undefined = undefined
          let txNotFoundRetryNums = 0
          web3.setCurrentNodeProvider(alephium.nodeProvider)

          const subscriptionOptions: SubscribeOptions<TxStatus> = {
            pollingInterval: 3000,
            messageCallback: async (status: TxStatus): Promise<void> => {
              switch (status.type) {
                case "Confirmed": {
                  console.log(`Transaction ${lastTransactionHash} is confirmed`)
                  setTransactionStatus("success")

                  if (transferingMintedToken) {
                    console.log("reset mint token")
                    resetMintToken()
                  }

                  subscription?.unsubscribe()
                  break
                }

                case "TxNotFound": {
                  console.log(`Transaction ${lastTransactionHash} is not found`)
                  if (txNotFoundRetryNums > 3) {
                    setTransactionStatus("failure")
                    setTransactionError(`Transaction ${lastTransactionHash} not found`)
                    subscription?.unsubscribe()
                  } else {
                    await new Promise(r => setTimeout(r, 3000));
                  }

                  txNotFoundRetryNums += 1
                  break
                }

                case "MemPooled": {
                  console.log(`Transaction ${lastTransactionHash} is in mempool`)
                  setTransactionStatus("pending")
                  break
                }
              }
            },
            errorCallback: (error: any, subscription): Promise<void> => {
              console.log(error)
              setTransactionStatus("failure")
              let message = error ? `${error}` : "No further details"
              if (error?.response) {
                message = JSON.stringify(error.response, null, 2)
              }
              setTransactionError(message)

              subscription.unsubscribe()
              return Promise.resolve()
            }
          }

          subscription = subscribeToTxStatus(subscriptionOptions, lastTransactionHash)
        } else {
          throw Error("Alephium object is not initialized")
        }
      }
    })()
  }, [transactionStatus, lastTransactionHash])

  const network = networkId()

  const handleMintSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setTransactionStatus("approve")

      console.log("mint", mintAmount)
      const result = await mintToken(mintAmount, network)
      console.log(result)

      setMintedToken(result.contractAddress)
      setLastTransactionHash(result.txId)
      setTransactionStatus("pending")
    } catch (e) {
      console.error(e)
      setTransactionStatus("idle")
    }
  }

  const handleTransferSubmit = async (e: React.FormEvent) => {
    try {
      e.preventDefault()
      setTransactionStatus("approve")

      console.log("transfer", { transferTo, transferAmount })
      const result = await transferToken(transferTokenAddress, transferTo, transferAmount, network)
      console.log(result)

      setLastTransactionHash(result.txId)
      setTransactionStatus("pending")
    } catch (e) {
      console.error(e)
      setTransactionStatus("idle")
    }
  }

  const handleWithdrawMintedTokenSubmit = async (e: React.FormEvent) => {
    try {
      e.preventDefault()
      if (mintedToken) {
        setTransactionStatus("approve")
        console.log("transfer", { transferTo, transferAmount, mintedToken })

        const result = await withdrawMintedToken(mintAmount, mintedToken)

        setLastTransactionHash(result.txId)
        setTransactionStatus("pending")
        setTransferingMintedToken(true)
      } else {
        throw Error("No minted token")
      }
    } catch (e) {
      console.error(e)
      setTransactionStatus("idle")
    }
  }

  const handleSignSubmit = async (e: React.FormEvent) => {
    try {
      e.preventDefault()
      setTransactionStatus("approve")

      console.log("sign", shortText)
      const result = await signMessage(shortText)
      console.log(result)

      setLastSig(result)
      setTransactionStatus("success")
    } catch (e) {
      console.error(e)
      setTransactionStatus("idle")
    }
  }

  return (
    <>
      <h3 style={{ margin: 0 }}>
        Transaction status: <code>{transactionStatus}</code>
      </h3>
      {lastTransactionHash && (
        <h3 style={{ margin: 0 }}>
          Transaction hash:{" "}
          <a
            href={`${getExplorerBaseUrl()}/tx/${lastTransactionHash}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: "blue", margin: "0 0 1em" }}
          >
            <code>{lastTransactionHash}</code>
          </a>
        </h3>
      )}
      {transactionError && (
        <h3 style={{ margin: 0 }}>
          Transaction error:{" "}
          <textarea
            style={{ width: "100%", height: 100, background: "white" }}
            value={transactionError}
            readOnly
          />
        </h3>
      )}

      <h3 style={{ margin: 0 }}>
        ALPH Balance: <code>{alphBalance?.balance && convertSetToAlph(alphBalance.balance)}</code>
      </h3>
      <h3 style={{ margin: 0 }}>
        {
          tokenBalances.length > 0 ? (
            <>
              <label>Token Balances ({tokenBalances.length} tokens in total)</label>
              <div className="columns">
                <Select
                  value={selectedTokenBalance}
                  onChange={
                    (selected) => {
                      setSelectedTokenBalance(selected)
                    }
                  }
                  options={
                    tokenBalances.map((tokenBalance, index) => {
                      return { value: tokenBalance, label: tokenBalance.id }
                    })
                  }
                />
                <code>{selectedTokenBalance?.value.balance.balance.toString()}</code>
              </div>
            </>
          ) : <div>No tokens</div>
        }

      </h3>

      <div className="columns">
        {
          (mintedToken && alephium?.connectedAddress) ? (
            <form onSubmit={handleWithdrawMintedTokenSubmit}>
              <h2 className={styles.title}>Withdraw all minted token</h2>
              <label htmlFor="token-address">Token Address</label>
              <p>{mintedToken}</p>

              <label htmlFor="transfer-to">To</label>
              <input
                type="text"
                id="transfer-to"
                name="fname"
                disabled
                value={alephium.connectedAddress}
                onChange={(e) => setTransferTo(e.target.value)}
              />

              <label htmlFor="transfer-amount">Amount</label>
              <input
                type="number"
                id="transfer-amount"
                name="fname"
                disabled
                value={mintAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
              />
              <br />
              <input type="submit" disabled={buttonsDisabled} value="Withdraw" />
            </form>

          ) : (
            <form onSubmit={handleMintSubmit}>
              <h2 className={styles.title}>Mint token</h2>

              <label htmlFor="mint-amount">Amount</label>
              <input
                type="number"
                id="mint-amount"
                name="fname"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
              />

              <input type="submit" />
            </form>

          )
        }
        <form onSubmit={handleTransferSubmit}>
          <h2 className={styles.title}>Transfer token</h2>

          <label htmlFor="transfer-token-address">Token Address</label>
          <input
            type="text"
            id="transfer-to"
            name="fname"
            value={transferTokenAddress}
            onChange={(e) => setTransferTokenAddress(e.target.value)}
          />

          <label htmlFor="transfer-to">To</label>
          <input
            type="text"
            id="transfer-to"
            name="fname"
            value={transferTo}
            onChange={(e) => setTransferTo(e.target.value)}
          />

          <label htmlFor="transfer-amount">Amount</label>
          <input
            type="number"
            id="transfer-amount"
            name="fname"
            value={transferAmount}
            onChange={(e) => setTransferAmount(e.target.value)}
          />
          <br />
          <input type="submit" disabled={buttonsDisabled} value="Transfer" />
        </form>
      </div>
      <div className="columns">
        <form onSubmit={handleSignSubmit}>
          <h2 className={styles.title}>Sign Message</h2>

          <label htmlFor="mint-amount">Short Text</label>
          <input
            type="text"
            id="short-text"
            name="short-text"
            value={shortText}
            onChange={(e) => setShortText(e.target.value)}
          />

          <input type="submit" value="Sign" />
        </form>
        <form>
          <h2 className={styles.title}>Sign results</h2>

          {/* Label and textarea for value r */}
          <label htmlFor="r">r</label>
          <textarea
            className={styles.textarea}
            id="r"
            name="r"
            value={lastSig[0]}
            readOnly
          />
          {/* Label and textarea for value s */}
          <label htmlFor="s">s</label>
          <textarea
            className={styles.textarea}
            id="s"
            name="s"
            value={lastSig[1]}
            readOnly
          />
        </form>
      </div>
    </>
  )
  return (<div>Token App</div>)
}

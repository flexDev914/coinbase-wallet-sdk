// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import Web3 from "web3"

declare global {
  interface Window {
    Web3: typeof Web3
  }
}

function chromeMain(): void {
  const { WALLETLINK_WEB_URL } = process.env

  const shouldntInject: boolean =
    (WALLETLINK_WEB_URL && location.origin.startsWith(WALLETLINK_WEB_URL)) ||
    (window.frameElement && window.frameElement.id === "__WalletLink__") ||
    document.documentElement!.hasAttribute("data-no-walletlink")

  if (shouldntInject) {
    return
  }

  window.Web3 = Web3

  const js: string = require("../build/walletlink.js").default
  const container = document.head || document.documentElement!
  const s = document.createElement("script")
  s.textContent = `
    ${js};\n
    window.walletLink = new WalletLink({ appName: "WalletLink App" })
    window.web3 = new Web3(
      walletLink.makeWeb3Provider(
        "https://mainnet.infura.io/v3/38747f203c9e4ffebbdaf0f6c09ad72c",
        1
      )
    )
  `
  container.insertBefore(s, container.children[0])
}

chromeMain()

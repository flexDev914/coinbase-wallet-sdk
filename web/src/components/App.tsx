// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import bind from "bind-decorator"
import { createHashHistory } from "history"
import React from "react"
import { Route, RouteComponentProps, Router } from "react-router-dom"
import { Subscription } from "rxjs"
import { SERVER_URL, WEB_URL } from "../config"
import { Session } from "../models/Session"
import { LinkedMessage } from "../WalletLink/types/LinkedMessage"
import { UnlinkedMessage } from "../WalletLink/types/UnlinkedMessage"
import { WalletLinkHost } from "../WalletLink/WalletLinkHost"
import { WalletLinkWeb3Handler } from "../WalletLink/WalletLinkWeb3Handler"
import { LinkRoute } from "./Link/LinkRoute"
import { RootRoute } from "./Root/RootRoute"

type State = Readonly<{
  connected: boolean
  linked: boolean
}>

export class App extends React.PureComponent<{}, State> {
  private readonly history = createHashHistory()

  private session = Session.load() || new Session().save()
  private walletLinkHost: WalletLinkHost | null = null
  private web3Handler: WalletLinkWeb3Handler | null = null
  private subscriptions = new Subscription()

  public state: State = {
    connected: false,
    linked: false
  }

  public componentDidMount() {
    const { session } = this
    const walletLinkHost = new WalletLinkHost(
      session.id,
      session.key,
      SERVER_URL
    )
    const web3Handler = new WalletLinkWeb3Handler(
      walletLinkHost,
      session.secret
    )
    this.walletLinkHost = walletLinkHost
    this.web3Handler = web3Handler

    walletLinkHost.connect()
    web3Handler.listen()

    this.subscriptions.add(
      walletLinkHost.connected$.subscribe(v => this.setState({ connected: v }))
    )
    this.subscriptions.add(
      walletLinkHost.linked$.subscribe(linked => {
        this.setState({ linked })
        if (linked) {
          // tslint:disable-next-line: tsr-detect-unsafe-cross-origin-communication
          window.parent.postMessage(LinkedMessage(), "*")
        }
      })
    )

    this.subscriptions.add(
      Session.sessionIdChange$.subscribe(change => {
        if (window.parent && change.oldValue && !change.newValue) {
          // tslint:disable-next-line: tsr-detect-unsafe-cross-origin-communication
          window.parent.postMessage(UnlinkedMessage(), "*")
        }
      })
    )
  }

  public componentWillUnmount() {
    this.subscriptions.unsubscribe()

    if (this.walletLinkHost) {
      this.walletLinkHost.destroy()
      this.walletLinkHost = null
    }
    if (this.web3Handler) {
      this.web3Handler.destroy()
      this.web3Handler = null
    }
  }

  public render() {
    return (
      <Router history={this.history}>
        <Route exact path="/" component={RootRoute} />
        <Route exact path="/link" render={this.renderLinkRoute} />
      </Router>
    )
  }

  @bind
  private renderLinkRoute(routeProps: RouteComponentProps) {
    const { connected, linked } = this.state
    const { session } = this

    return (
      <LinkRoute
        {...routeProps}
        connected={connected}
        linked={linked}
        webUrl={WEB_URL}
        serverUrl={SERVER_URL}
        sessionId={session.id}
        sessionSecret={session.secret}
      />
    )
  }
}

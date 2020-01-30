// Copyright (c) 2018-2020 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import clsx from "clsx"
import { FunctionComponent, h, render } from "preact"
import { useEffect, useState } from "preact/hooks"
import chevronSvg from "../images/chevronSvg"
import css from "./Snackbar.css"

export interface SnackbarItemProps {
  message?: string
  showProgressBar?: boolean
  actions?: SnackbarItemAction[]
}

export interface SnackbarItemAction {
  info: string
  buttonLabel: string
  onClick: () => void
}

export class Snackbar {
  private items = new Map<number, SnackbarItemProps>()
  private nextItemKey = 0
  private root: Element | null = null

  public attach(el: Element): void {
    this.root = document.createElement("div")
    this.root.className = "-walletlink-snackbar-root"
    el.appendChild(this.root)

    this.render()
  }

  public presentItem(itemProps: SnackbarItemProps): () => void {
    const key = this.nextItemKey++
    this.items.set(key, itemProps)
    this.render()

    return () => {
      this.items.delete(key)
      this.render()
    }
  }

  public clear(): void {
    this.items.clear()
    this.render()
  }

  private render(): void {
    if (!this.root) {
      return
    }
    render(
      <SnackbarContainer>
        {Array.from(this.items.entries()).map(([key, itemProps]) => (
          <SnackbarItem {...itemProps} key={key} />
        ))}
      </SnackbarContainer>,
      this.root
    )
  }
}

const SnackbarContainer: FunctionComponent = ({ children }) => (
  <div class="-walletlink-snackbar-container">
    <style>{css}</style>
    <div class="-walletlink-snackbar">{children}</div>
  </div>
)

const SnackbarItem: FunctionComponent<SnackbarItemProps> = ({
  message,
  showProgressBar,
  actions
}) => {
  const [hidden, setHidden] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const timers = [
      window.setTimeout(() => {
        setHidden(false)
      }, 1),
      window.setTimeout(() => {
        setExpanded(true)
      }, 10000)
    ]

    return () => {
      timers.forEach(window.clearTimeout)
    }
  })

  const toggleExpanded = () => {
    setExpanded(!expanded)
  }

  return (
    <div
      class={clsx(
        "-walletlink-snackbar-item",
        hidden && "-walletlink-snackbar-item-hidden",
        expanded && "-walletlink-snackbar-item-expanded"
      )}
    >
      <div class="-walletlink-snackbar-item-content" onClick={toggleExpanded}>
        <div class="-walletlink-snackbar-item-content-message">{message}</div>
        <img
          class="-walletlink-snackbar-item-content-chevron"
          src={chevronSvg}
          alt="Expand"
        />
      </div>
      {showProgressBar && (
        <div class="-walletlink-snackbar-item-progress-bar" />
      )}
      {actions && actions.length > 0 && (
        <div class="-walletlink-snackbar-item-actions">
          {actions.map((action, i) => (
            <div class="-walletlink-snackbar-item-actions-item" key={i}>
              <span class="-walletlink-snackbar-item-actions-item-info">
                {action.info}
              </span>
              <button
                class="-walletlink-snackbar-item-actions-item-button"
                onClick={action.onClick}
              >
                {action.buttonLabel}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

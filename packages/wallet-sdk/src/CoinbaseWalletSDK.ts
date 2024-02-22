// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { LogoType, walletLogo } from './assets/wallet-logo';
import { ScopedLocalStorage } from './core/ScopedLocalStorage';
import { getFavicon } from './core/util';
import { CoinbaseWalletProvider } from './provider/CoinbaseWalletProvider';
import { ProviderInterface } from './provider/ProviderInterface';
import { LIB_VERSION } from './version';

export const ConnectionPreferences = ['default', 'external', 'embedded'] as const;
export type ConnectionPreference = (typeof ConnectionPreferences)[number];

/** Coinbase Wallet SDK Constructor Options */
export interface CoinbaseWalletSDKOptions {
  /** Application name */
  appName: string;
  /** @optional Application logo image URL; favicon is used if unspecified */
  appLogoUrl?: string | null;
  // TODO: to remove scwUrl before release
  /** @optional SCW FE URL */
  scwUrl?: string;
  /** @optional Array of chainIds your dapp supports */
  chainIds?: string[];
  /** @optional Pre-select the wallet connection method */
  connectionPreference?: ConnectionPreference;
}

export class CoinbaseWalletSDK {
  private appName = '';
  private appLogoUrl: string | null = null;
  private connectionPreference: ConnectionPreference;
  private chainIds: number[];
  private scwUrl?: string;

  /**
   * Constructor
   * @param options Coinbase Wallet SDK constructor options
   */
  constructor(options: Readonly<CoinbaseWalletSDKOptions>) {
    this.connectionPreference = options.connectionPreference || 'default';
    this.chainIds = options.chainIds ? options.chainIds.map(Number) : [];

    // TODO: revisit arg name. update default url to production.
    this.scwUrl = options.scwUrl || 'https://scw-dev.cbhq.net/connect';

    this.appName = options.appName || 'DApp';
    this.appLogoUrl = options.appLogoUrl || getFavicon();

    this.storeLatestVersion();
  }

  private storeLatestVersion() {
    const versionStorage = new ScopedLocalStorage('CBWSDK');
    versionStorage.setItem('VERSION', LIB_VERSION);
  }

  public makeWeb3Provider(): ProviderInterface {
    const extension = this.walletExtension;
    if (extension) {
      extension.setAppInfo?.(this.appName, this.appLogoUrl);
      return extension;
    }

    const dappBrowser = this.coinbaseBrowser;
    if (dappBrowser) {
      return dappBrowser;
    }

    return new CoinbaseWalletProvider({
      scwUrl: this.scwUrl,
      appName: this.appName,
      appLogoUrl: this.appLogoUrl,
      appChainIds: this.chainIds,
      connectionPreference: this.connectionPreference,
    });
  }

  public disconnect(): void {
    const extension = this?.walletExtension;
    if (extension) {
      extension.close?.();
    } else {
      ScopedLocalStorage.clearAll();
    }
  }

  /**
   * Official Coinbase Wallet logo for developers to use on their frontend
   * @param type Type of wallet logo: "standard" | "circle" | "text" | "textWithLogo" | "textLight" | "textWithLogoLight"
   * @param width Width of the logo (Optional)
   * @returns SVG Data URI
   */
  public getCoinbaseWalletLogo(type: LogoType, width = 240): string {
    return walletLogo(type, width);
  }

  private get walletExtension(): LegacyProviderInterface | undefined {
    return window.coinbaseWalletExtension ?? window.walletLinkExtension;
  }

  private get coinbaseBrowser(): LegacyProviderInterface | undefined {
    try {
      // Coinbase DApp browser does not inject into iframes so grab provider from top frame if it exists
      const ethereum = window.ethereum ?? window.top?.ethereum;
      if (!ethereum) {
        return undefined;
      }

      if ('isCoinbaseBrowser' in ethereum && ethereum.isCoinbaseBrowser) {
        return ethereum;
      }
      return undefined;
    } catch (e) {
      return undefined;
    }
  }
}

interface LegacyProviderInterface extends ProviderInterface {
  setAppInfo?(appName: string, appLogoUrl: string | null): void;
  close?(): void;
}

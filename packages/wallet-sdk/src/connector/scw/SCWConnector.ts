import { AddressString } from '../../core/type';
import { RequestArguments } from '../../provider/ProviderInterface';
import { PopUpCommunicator } from '../../transport/PopUpCommunicator';
import { LIB_VERSION } from '../../version';
import { Connector } from '../ConnectorInterface';
import { exportKeyToHexString, importKeyFromHexString } from './protocol/key/Cipher';
import { KeyStorage } from './protocol/key/KeyStorage';
import {
  decryptContent,
  encryptContent,
  SCWRequestMessage,
  SCWResponseMessage,
} from './protocol/SCWMessage';
import { Action, SupportedEthereumMethods } from './protocol/type/Action';
import { SCWResponse } from './protocol/type/Response';

export class SCWConnector implements Connector {
  private appName: string;
  private appLogoUrl: string | null;
  // TODO: handle chainId
  private activeChainId = 1;

  private puc: PopUpCommunicator;
  private keyStorage: KeyStorage;

  constructor(options: {
    appName: string;
    appLogoUrl: string | null;
    puc: PopUpCommunicator;
    keyStorage: KeyStorage;
  }) {
    this.appName = options.appName;
    this.appLogoUrl = options.appLogoUrl;
    this.puc = options.puc;
    this.keyStorage = options.keyStorage;
    this.createRequestMessage = this.createRequestMessage.bind(this);
    this.decryptResponseMessage = this.decryptResponseMessage.bind(this);
  }

  public async handshake(): Promise<AddressString[]> {
    // TODO
    await this.puc.connect();

    const handshakeMessage = await this.createRequestMessage({
      handshake: {
        method: SupportedEthereumMethods.EthRequestAccounts,
        params: {
          dappName: this.appName,
          dappLogoUrl: this.appLogoUrl,
        },
      },
    });

    const response = (await this.puc.request(handshakeMessage)) as SCWResponseMessage;

    // throw protocol level error
    if ('failure' in response.content) {
      throw response.content.failure;
    }

    // take the peer's public key and store it
    const peerPublicKey = await importKeyFromHexString('public', response.sender);
    await this.keyStorage.setPeerPublicKey(peerPublicKey);

    const decrypted = await this.decryptResponseMessage<AddressString[]>(response);
    const result = decrypted.result;

    if ('error' in result) {
      throw result.error;
    }

    return result.value;
  }

  public async request<T>(request: RequestArguments): Promise<T> {
    // TODO: this check makes sense, but connected isn't set properly so it prevents
    // need to investigate
    // if (!this.puc.connected) {
    await this.puc.connect();
    // }

    const sharedSecret = await this.keyStorage.getSharedSecret();
    if (!sharedSecret) {
      // TODO: better error
      throw new Error('Invalid session');
    }

    const encrypted = await encryptContent(
      {
        action: request as Action,
        chainId: this.activeChainId,
      },
      sharedSecret
    );
    const message = await this.createRequestMessage({ encrypted });

    const response = (await this.puc.request(message)) as SCWResponseMessage;
    const decrypted = await this.decryptResponseMessage<T>(response);
    const result = decrypted.result;

    if ('error' in result) {
      throw result.error;
    }

    return result.value;
  }

  private async createRequestMessage(
    content: SCWRequestMessage['content']
  ): Promise<SCWRequestMessage> {
    const publicKey = await exportKeyToHexString('public', await this.keyStorage.getOwnPublicKey());
    return {
      type: 'scw',
      id: crypto.randomUUID(),
      sender: publicKey,
      content,
      version: LIB_VERSION,
      timestamp: new Date(),
    };
  }

  private async decryptResponseMessage<T>(message: SCWResponseMessage): Promise<SCWResponse<T>> {
    const content = message.content;

    // throw protocol level error
    if ('failure' in content) {
      throw content.failure;
    }

    const sharedSecret = await this.keyStorage.getSharedSecret();
    if (!sharedSecret) {
      // TODO: better error
      throw new Error('Invalid session');
    }

    return decryptContent(content.encrypted, sharedSecret);
  }
}

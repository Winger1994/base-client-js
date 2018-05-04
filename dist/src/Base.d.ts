import { AccountManager } from './manager/AccountManager';
import { ProfileManager } from './manager/ProfileManager';
import { DataRequestManager } from './manager/DataRequestManager';
import { RepositoryStrategyType } from './repository/RepositoryStrategyType';
import { OfferManager } from './manager/OfferManager';
import { SearchRequestManager } from './manager/SearchRequestManager';
import SearchRequest from './repository/models/SearchRequest';
import Offer from './repository/models/Offer';
import { WalletManager } from './manager/WalletManager';
export { RepositoryStrategyType } from './repository/RepositoryStrategyType';
export { CompareAction } from './repository/models/CompareAction';
export { RpcTransport } from './repository/source/rpc/RpcTransport';
export { HttpTransport } from './repository/source/http/HttpTransport';
export { HttpInterceptor } from './repository/source/http/HttpInterceptor';
export { TransportFactory } from './repository/source/TransportFactory';
export { KeyPairFactory } from './utils/keypair/KeyPairFactory';
export { RemoteSigner } from './utils/keypair/RemoteSigner';
export { CryptoUtils } from './utils/CryptoUtils';
export { Permissions } from './utils/keypair/Permissions';
export { WalletUtils } from './utils/WalletUtils';
export { EthereumUtils } from './utils/EthereumUtils';
export { BaseAddrPair, AddrRecord, WalletsRecords, WealthRecord, WealthPtr, ProfileUser, ProfileWealthValidator } from './utils/types/BaseTypes';
export { AccountManager, ProfileManager, DataRequestManager, OfferManager, SearchRequestManager, WalletManager, SearchRequest, Offer, Base as NodeAPI };
export default class Base {
    private _walletManager;
    private _accountManager;
    private _profileManager;
    private _dataRequestManager;
    private _offerManager;
    private _searchRequestManager;
    private _authAccountBehavior;
    private _repositoryStrategyInterceptor;
    constructor(nodeHost: string, siteOrigin: string, strategy?: RepositoryStrategyType, signerHost?: string);
    changeStrategy(strategy: RepositoryStrategyType): void;
    readonly walletManager: WalletManager;
    readonly accountManager: AccountManager;
    readonly profileManager: ProfileManager;
    readonly dataRequestManager: DataRequestManager;
    readonly offerManager: OfferManager;
    readonly searchRequestManager: SearchRequestManager;
    private createNodeAssistant(httpTransport);
    private createKeyPairHelper(signerHost, permissionSource, siteDataSource, siteOrigin);
}

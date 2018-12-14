import { ShareDataRepository } from './ShareDataRepository';
import { AccessRight } from '../../utils/keypair/Permissions';
import { DataRequestManager } from '../../manager/DataRequestManager';
import DataRequest from '../models/DataRequest';
import { ProfileManager } from '../../manager/ProfileManager';
import NoncePointer from './NoncePointer';
import SubscriptionPointer from '../service/SubscriptionPointer';
import SharePointer from './SharePointer';
import { TokenPointer, Token } from './TokenPointer';
import { OfferShareDataRepository } from './OfferShareDataRepository';
import { WalletManagerImpl } from '../../manager/WalletManagerImpl';

var fs = require('fs');
const path = require('path');

// An helper data structure used at the business side to keep track
// of the data field that need to be fetched from service provider
class NoncePointerTuple {
    userEntryKey: string;
    sharePointerKey: string;
    noncePointer: NoncePointer;
    noncePointerKey: string;

    constructor(userEntryKey: string, sharePointerKey: string, noncePointer: NoncePointer, noncePointerKey: string) {
        this.userEntryKey = userEntryKey;
        this.sharePointerKey = sharePointerKey;
        this.noncePointer = noncePointer;
        this.noncePointerKey = noncePointerKey;
    }
}

export default class ShareDataRepositoryImpl implements ShareDataRepository {

    private dataRequestManager: DataRequestManager;
    private profileManager: ProfileManager;
    private offerShareDataRepository: OfferShareDataRepository;
    private contract: any;
    private eth_wallets: string;
    private static min: number = 1;
    private static max: number = 0x7FFFFFFF;
    private static gwei: number = 1000000000;
    private userShare: number = 1;
    private spShare: number = 1;

    constructor(
        dataRequestManager: DataRequestManager,
        profileManager: ProfileManager,
        offerShareDataRepository: OfferShareDataRepository,
        web3: any,
        contractAddress: string,
        eth_wallets: string) {
        this.dataRequestManager = dataRequestManager;
        this.profileManager = profileManager;
        this.offerShareDataRepository = offerShareDataRepository;
        this.eth_wallets = eth_wallets;
        const parsed = JSON.parse(fs.readFileSync(path.resolve(__dirname, "./Purchase.json")));
        // TODO: set the gasPrice and gas limit here
        this.contract = new web3.eth.Contract(parsed.abi, contractAddress, {
            from: contractAddress,
            gasPrice: '2000', // 2000 wei for the gas price
            gas: 1000000,
        });
        this.contract.setProvider(web3.currentProvider);
    }

    public async grantAccessForOffer(
        offerSearchId: number,
        offerOwner: string,
        acceptedFields: Map<string, AccessRight>,
        priceId: number,
        clientId: string): Promise<boolean> {
        return this.dataRequestManager.grantAccessForOffer(
            offerSearchId,
            offerOwner,
            acceptedFields,
            priceId).then(() => {
                // Find all the requested fields that are generated
                // by service provider
                return this.profileManager.getData().then((data) => {
                    let keys: Array<string> = new Array();
                    acceptedFields.forEach((value: AccessRight, key: string) => {
                        const entryData: string | undefined = data.get(key);
                        if (entryData !== undefined && SubscriptionPointer.conform(entryData)) {
                            // This is a pointer entry, create the key that business will generate
                            const subscriptionPointer: SubscriptionPointer = JSON.parse(entryData);
                            keys.push(NoncePointer.generateKey(clientId, subscriptionPointer.spid));
                        }
                    });
                    // Case: none of the requested data is generated by service provider
                    if (keys.length == 0) {
                        return new Promise<boolean>(resolve => resolve(true));
                    }
                    // Case: some of the requested data is generated by service provider
                    else {
                        // Wait response from business and then notify service provider to
                        // share the data with business
                        return new Promise<boolean>((resolve) => {
                            let timer = setInterval(
                                async () => {
                                    const entries: Map<string, string> = await this.checkRequestStatus(clientId, offerOwner, keys);
                                    if (entries.size == keys.length) {
                                        // Business is ready, client tell each service provider to share data
                                        // with business by creating & sharing data entries
                                        for (let entry of entries.entries()) {
                                            // Here the key will be a tuple of uid and spid, value will be
                                            // a business generated nonce, and the transaction key
                                            await this.notifyServiceProvider(entry[1], entry[0], offerOwner, this.eth_wallets);
                                        }
                                        resolve(true);
                                        clearTimeout(timer);
                                    }
                                },
                                10000);
                        });
                    }
                });
            });
    }

    public async acceptShareData(data: Map<string, string>, uid: string, bid: string, searchId: number, worth: string): Promise<Map<string, string>> {
        // Return value
        let resMap: Map<string, string> = new Map();
        // Calculate the value of each reward share, the shared eth_wallets record is not included
        const totalShare: number = (data.size - 1) * (this.userShare + this.spShare);
        const shareValue: number = Math.floor(+worth * ShareDataRepositoryImpl.gwei / totalShare);
        const transactionValue: number = shareValue * (this.userShare + this.spShare);
        // Get the eth_wallets address of this user
        const user_eth_wallets: any = data.get(WalletManagerImpl.DATA_KEY_ETH_WALLETS);
        return new Promise<Map<string, string>>((resolve) => {
            this.offerShareDataRepository.acceptShareData(searchId, worth)
                .then(async () => {
                    let spidEntry: Map<string, NoncePointerTuple> = new Map();
                    // Parse all the shared fields and see which fields are generated by
                    // third-party service providers
                    for (let entry of data.entries()) {
                        if (entry[0] === WalletManagerImpl.DATA_KEY_ETH_WALLETS) {
                            continue;
                        }
                        if (SubscriptionPointer.conform(entry[1])) {
                            const subscriptionPointer: SubscriptionPointer = JSON.parse(entry[1]);
                            const spid: string = subscriptionPointer.spid;
                            // Initialize a transaction between user, service provider and business
                            const trans: any = await this.contract.methods.InitTransaction(this.userShare * shareValue, this.spShare * shareValue).send({ from: this.eth_wallets, value: transactionValue });
                            const transactionKey: string = trans['events']['TransactionInited']['returnValues']['transKey'];
                            await this.contract.methods.AssignUser(transactionKey, user_eth_wallets).send({ from: this.eth_wallets });
                            // TODO: the schema is not used here
                            spidEntry.set(spid, new NoncePointerTuple(
                                entry[0],
                                SharePointer.generateKey(uid, bid),
                                new NoncePointer(this.getRandomInt(), transactionKey),
                                NoncePointer.generateKey(uid, spid)));
                        } else {
                            // If the data shared is not generated by service provider (only between user and business), 
                            // this single transaction is finished
                            resMap.set(entry[0], entry[1]);
                            // Initialize a transaction between user and business
                            const trans: any = await this.contract.methods.InitTransaction(transactionValue, 0).send({ from: this.eth_wallets, value: transactionValue });
                            const transactionKey: string = trans['events']['TransactionInited']['returnValues']['transKey'];
                            await this.contract.methods.AssignUser(transactionKey, user_eth_wallets).send({ from: this.eth_wallets });
                            await this.contract.methods.BusinessConfirm(transactionKey).send({ from: this.eth_wallets });
                        }
                    }
                    if (spidEntry.size > 0) {
                        let updates: Map<string, string> = new Map();
                        spidEntry.forEach((value: NoncePointerTuple) => {
                            updates.set(value.noncePointerKey, JSON.stringify(value.noncePointer));
                        });
                        this.profileManager.updateData(updates).then(() => {
                            // Share back to user, get the current request status first
                            this.dataRequestManager.getGrantedPermissionsToMe(uid).then((grantedFields) => {
                                let grantFields: Map<string, AccessRight> = new Map();
                                grantedFields.forEach((field: string) => grantFields.set(field, AccessRight.R));
                                updates.forEach((value: string, field: string) => grantFields.set(field, AccessRight.R));
                                this.dataRequestManager.grantAccessForClient(uid, grantFields).then(() => {
                                    let timer = setInterval(
                                        async () => {
                                            const spids: Array<string> = Array.from(spidEntry.keys());
                                            for (let i = 0; i < spids.length; ++i) {
                                                const noncePointerTuple: NoncePointerTuple | undefined = spidEntry.get(spids[i]);
                                                if (noncePointerTuple === undefined) {
                                                    continue;
                                                }
                                                let keyArray: Array<string> = new Array();
                                                keyArray.push(noncePointerTuple.sharePointerKey);
                                                const response: Map<string, string> = await this.checkRequestStatus(bid, spids[i], Array.from(keyArray));
                                                const dataString: string | undefined = response.get(noncePointerTuple.sharePointerKey);
                                                if (dataString !== undefined) {
                                                    const sharePointer: SharePointer = JSON.parse(dataString);
                                                    if (this.businessVerifyMessage(sharePointer, uid, bid, noncePointerTuple.noncePointer.nonce)) {
                                                        // Confirm data from this service provider is received and is verified, remove the key
                                                        // from spidKey
                                                        resMap.set(noncePointerTuple.userEntryKey, sharePointer.data);
                                                        spidEntry.delete(spids[i]);
                                                        await this.contract.methods.BusinessConfirm(noncePointerTuple.noncePointer.transactionKey).send({ from: this.eth_wallets });
                                                    }
                                                }
                                            }
                                            // Check if responses from all service provider has received
                                            if (spidEntry.size == 0) {
                                                resolve(resMap);
                                                clearTimeout(timer);
                                            }
                                        },
                                        10000);
                                });
                            });
                        });
                    } else {
                        resolve(resMap);
                    }
                })
                .catch(() => resolve(resMap));
        });
    }

    public async shareWithBusiness(key: string, value: string, uid: string): Promise<boolean> {
        const tokenPointer: TokenPointer = JSON.parse(value);
        const bid: string = TokenPointer.getBID(key);
        const transactionKey: string = tokenPointer.token.transactionKey;
        // Get the data of this client generated by this service provider
        return this.profileManager.getData()
            .then((entries) => {
                return new Promise<boolean>(async (resolve) => {
                    const data: string | undefined = entries.get(uid);
                    if (data === undefined) {
                        resolve(false);
                    } else {
                        await this.contract.methods.AssignSP(transactionKey, this.eth_wallets).send({ from: this.eth_wallets });
                        const sharePointer: SharePointer = new SharePointer(tokenPointer, data);
                        const key: string = SharePointer.generateKey(uid, bid);
                        const updates: Map<string, string> = new Map();
                        updates.set(key, JSON.stringify(sharePointer));
                        this.profileManager.updateData(updates)
                            .then(() => {
                                // Grant this entry to client
                                this.grantAccessForClientHelper(uid, key, AccessRight.R)
                                    .then((res) => {
                                        if (!res) {
                                            resolve(false);
                                        } else {
                                            // Grant this entry to business
                                            this.grantAccessForClientHelper(bid, key, AccessRight.R)
                                                .then(async (res) => {
                                                    if (!res) {
                                                        resolve(false);
                                                    } else {
                                                        await this.contract.methods.SPConfirm(transactionKey).send({ from: this.eth_wallets });
                                                        resolve(true);
                                                    }
                                                })
                                                .catch(() => resolve(false));
                                        }
                                    })
                                    .catch(() => resolve(false));
                            })
                            .catch(() => resolve(false));
                    }
                })
            })
            .catch(() => { return new Promise<boolean>(resolve => resolve(false)) });
    }

    public isSharePointerExist(uid: string, bid: string): Promise<boolean> {
        const sharePointerKey: string = SharePointer.generateKey(uid, bid);
        return new Promise<boolean>((resolve) => {
            this.profileManager.getData()
                .then((data) => {
                    resolve(data.get(sharePointerKey) ? true : false);
                });
        });
    }

    /**
     * Check whether all the keys are granted.
     * @param from 
     * @param to 
     * @param keys 
     */
    private async checkRequestStatus(from: string, to: string, keys: Array<string>): Promise<Map<string, string>> {
        let res: Map<string, string> = new Map();
        const dataRequests: Array<DataRequest> = await this.dataRequestManager.getRequests(from, to);
        for (let i = 0; i < dataRequests.length; ++i) {
            const request: DataRequest = dataRequests[i];
            if (request.responseData.length == 0) {
                continue;
            }
            const data: Map<string, string> = await this.profileManager.getAuthorizedData(request.toPk, request.responseData);
            for (let j = 0; j < keys.length; ++j) {
                const value: string | undefined = data.get(keys[j]);
                if (value !== undefined) {
                    res.set(keys[j], value);
                }
            }
        }
        return res;
    }

    /**
     * Notify service provider to share data with business by writing TokenPointer in storage
     * and share it with service provider.
     * @param value Business generated nonce
     * @param key A tuple of the uid and spid
     * @param bid Id of the business to share the data
     */
    private async notifyServiceProvider(value: string, key: string, bid: string, eth_wallets: string): Promise<void> {
        const uid: string = NoncePointer.getUID(key);
        const spid: string = NoncePointer.getSPID(key);
        const noncePointer: NoncePointer = JSON.parse(value);
        // Get and calculate the hash of data that is going to be shared
        const dataRequests: Array<DataRequest> = await this.dataRequestManager.getRequests(uid, spid);
        let dataHash: string = '';
        for (let i = 0; i < dataRequests.length; ++i) {
            const request: DataRequest = dataRequests[i];
            const entries: Map<string, string> = await this.profileManager.getAuthorizedData(request.toPk, request.responseData);
            const data: string | undefined = entries.get(uid);
            if (data !== undefined) {
                dataHash = this.calculateHash(data);
                break;
            }
        }
        // Create & write TokenPointer into own storage
        const token: Token = new Token(bid, noncePointer.nonce, dataHash, Date.now().toString(), noncePointer.transactionKey);
        const tokenPointer: TokenPointer = new TokenPointer(
            token,
            await this.profileManager.signMessage(JSON.stringify(token)));
        const dataEntryKey: string = TokenPointer.generateKey(bid, spid);
        let updates: Map<string, string> = new Map();
        // Write own storage
        updates.set(dataEntryKey, JSON.stringify(tokenPointer));
        await this.profileManager.updateData(updates);
        // Share this entry with the corresponding service provider to notify it
        // to share data with this specific business.
        // Get the current grant permission status first.
        const grantedFields: Array<string> = await this.dataRequestManager.getGrantedPermissionsToMe(spid);
        let grantFields: Map<string, AccessRight> = new Map();
        for (let i = 0; i < grantedFields.length; ++i) {
            grantFields.set(grantedFields[i], AccessRight.R);
        }
        grantFields.set(dataEntryKey, AccessRight.R);
        await this.dataRequestManager.grantAccessForClient(spid, grantFields);
        // Confirm data has been sent
        await this.contract.methods.UserConfirm(noncePointer.transactionKey).send({ from: eth_wallets });
    }

    private calculateHash(message: string): string {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(message).digest('hex');
    }

    private grantAccessForClientHelper(clientId: string, key: string, permission: AccessRight): Promise<boolean> {
        // Get the current status first
        return new Promise<boolean>((resolve) => {
            this.dataRequestManager.getGrantedPermissionsToMe(clientId)
                .then((grantedFields) => {
                    let grantFields: Map<string, AccessRight> = new Map();
                    grantedFields.forEach((field: string) => grantFields.set(field, AccessRight.R));
                    grantFields.set(key, permission);
                    this.dataRequestManager.grantAccessForClient(clientId, grantFields)
                        .then(() => resolve(true))
                        .catch(() => resolve(false));
                })
                .catch(() => resolve(false));
        });
    }

    /**
     * Helper function to verify the data received at business side
     * @param sharePointer 
     * @param uid 
     * @param bid 
     * @param nonce 
     */
    private businessVerifyMessage(sharePointer: SharePointer, uid: string, bid: string, nonce: number): boolean {
        const Message = require('bitcore-message');
        const bitcore = require('bitcore-lib');
        const addrUser = bitcore.Address(bitcore.PublicKey(uid));
        // Verify signature
        if (!Message(JSON.stringify(sharePointer.tokenPointer.token)).verify(addrUser, sharePointer.tokenPointer.signature)) {
            return false;
        }
        // Verify bid & nonce & hash of data
        if (sharePointer.tokenPointer.token.bid !== bid
            || sharePointer.tokenPointer.token.nonce !== nonce
            || sharePointer.tokenPointer.token.dataHash !== this.calculateHash(sharePointer.data)) {
            return false;
        }
        return true;
    }

    private getRandomInt(): number {
        return Math.floor(Math.random() * (ShareDataRepositoryImpl.max - ShareDataRepositoryImpl.min + 1)) + ShareDataRepositoryImpl.min;
    }
}
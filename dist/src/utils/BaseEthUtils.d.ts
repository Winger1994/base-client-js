import * as BaseType from '../../src/utils/BaseTypes';
import { MessageSigner } from './keypair/MessageSigner';
import { AddrRecord } from './BaseTypes';
export declare enum EthWalletVerificationCodes {
    RC_OK = 0,
    RC_BASEID_MISSMATCH = -1,
    RC_ETH_ADDR_NOT_VERIFIED = -2,
    RC_ETH_ADDR_WRONG_SIGNATURE = -3,
    RC_ETH_ADDR_SCHEMA_MISSMATCH = -4,
    RC_GENERAL_ERROR = -100,
}
export declare class EthWalletVerificationStatus {
    rc: EthWalletVerificationCodes;
    err: string;
    details: Array<number>;
}
export default class BaseEthUtils {
    static verifyEthAddrRecord(msg: BaseType.AddrRecord): EthWalletVerificationCodes;
    static createEthAddrRecord(baseID: string, addr: string, ethPrvKey: string): BaseType.AddrRecord;
    static createEthWalletsRecordDebug(baseID: string, signedEthRecords: Array<BaseType.AddrRecord>, prvKey: string): Promise<BaseType.CryptoWallets>;
    static createEthWalletsRecordWithSigner(baseID: string, signedEthRecords: Array<AddrRecord>, signer: MessageSigner): Promise<BaseType.CryptoWallets>;
    static createEthWalletsRecordWithPrvKey(baseID: string, signedEthRecords: Array<BaseType.AddrRecord>, prvKey: string): Promise<BaseType.CryptoWallets>;
    static verifyEthWalletsRecord(baseID: string, msg: any): EthWalletVerificationStatus;
}

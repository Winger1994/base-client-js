export default class NoncePointer {
    static SEP: string;
    nonce: number;
    constructor(nonce: number);
    static generateKey(uid: string, spid: string): string;
    static getUID(key: string): string;
    static getSPID(key: string): string;
}

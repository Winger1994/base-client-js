class TokenPointer {
    public static SEP: string = '_';

    public token: Token;
    public signature: string;

    constructor(token: Token, signature: string) {
        this.token = token;
        this.signature = signature;
    }

    public static generateKey(bid: string, spid: string): string {
        return bid + TokenPointer.SEP + spid;
    }

    public static getBID(key: string): string {
        return key.split(this.SEP)[0];
    }

    public static getSPID(key: string): string {
        return key.split(this.SEP)[1];
    }

    public static conform(value: string): boolean {
        const obj: TokenPointer = JSON.parse(value);
        if (obj.token !== undefined && obj.signature !== undefined) {
            return Token.conform(obj.token);
        }
        return false;
    }

}

class Token {
    public bid: string;
    public nonce: number;
    public dataHash: string;
    public timestamp: string;

    constructor(bid: string, nonce: number, dataHash: string, timestamp: string) {
        this.bid = bid;
        this.nonce = nonce;
        this.dataHash = dataHash;
        this.timestamp = timestamp;
    }

    public static conform(obj: Token): boolean {
        if (obj.bid !== undefined && obj.nonce !== undefined && obj.dataHash !== undefined && obj.timestamp !== undefined) {
            return true;
        }
        return false;
    }
}

export {
    TokenPointer,
    Token
}
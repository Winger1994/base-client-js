import { RpcToken } from './RpcToken';
export default class RpcCheckSignature extends RpcToken {
    msg: string;
    sig: string;
    constructor(msg?: string, sig?: string, accessToken?: string);
}

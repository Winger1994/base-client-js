import { Service, ServiceInfo } from './Service';
import { AccessRight } from '../../utils/keypair/Permissions';
import { ProfileManager } from '../../manager/ProfileManager';
import { DataRequestManager } from '../../manager/DataRequestManager';

export class ServiceImpl implements Service {

    public static SUBSCRIPTION_PROCESSING: string = 'processing';
    public static SUBSCRIPTION_DENY: string = 'deny';

    private subscribers: Set<string>;
    private profileManager: ProfileManager;
    private dataRequestManager: DataRequestManager;
    private _serviceInfo: ServiceInfo;

    constructor(serviceInfo: ServiceInfo, profileManager: ProfileManager, dataRequestManager: DataRequestManager) {
        this.profileManager = profileManager;
        this.dataRequestManager = dataRequestManager;
        this._serviceInfo = serviceInfo;
        this.subscribers = new Set();
    }

    get serviceInfo(): ServiceInfo {
        return this._serviceInfo;
    }

    public toJsonString(): string {
        return JSON.stringify(this._serviceInfo);
    }

    public async addSubscriber(uid: string) {
        if (!this.subscribers.has(uid)) {
            /**
             * Create an data entry with the following format:
             * uid: processing / deny
             * And share back to the client with uid
             */
            // TODO: add deny logic
            this.subscribers.add(uid);
            const updates: Map<string, string> = new Map();
            updates.set(uid, ServiceImpl.SUBSCRIPTION_PROCESSING);
            await this.profileManager.updateData(updates);
            const grantFields: Map<string, AccessRight> = new Map();
            grantFields.set(uid, AccessRight.R);
            await this.dataRequestManager.grantAccessForClient(uid, grantFields);
        }
    }

    public async removeSubscriber(uid: string) {
        // TODO: In the current implementation, remove operation
        // is done by set "deny" into the data entry
        this.updateData(uid, ServiceImpl.SUBSCRIPTION_DENY);
    }

    public async updateData(uid: string, data: string) {
        if (this.subscribers.has(uid)) {
            const updates: Map<string, string> = new Map();
            updates.set(uid, data);
            await this.profileManager.updateData(updates);
        }
    }

}
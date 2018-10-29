import { Observable } from 'rxjs/Rx';
import Account from '../repository/models/Account';
import { Service, ServiceInfo } from '../repository/service/Service';
import { SubscriptionManager } from './SubscriptionManager';
import { ProfileManager } from './ProfileManager';
import { DataRequestManager } from './DataRequestManager';
import DataRequest from 'src/repository/models/DataRequest';

export class SubscriptionManagerImpl implements SubscriptionManager {

    public KEY_SERVICE_INFO: string = "service";
    public KEY_SUBSCRIPTION: string = "subscription";

    private serviceFinderId: string;
    private account: Account = new Account();
    private profileManager: ProfileManager;
    private dataRequestManager: DataRequestManager;

    constructor(
        serviceFinderId: string,
        profileManager: ProfileManager,
        dataRequestManager: DataRequestManager,
        authAccountBehavior: Observable<Account>) {

        this.serviceFinderId = serviceFinderId;
        this.profileManager = profileManager;
        this.dataRequestManager = dataRequestManager;

        authAccountBehavior
            .subscribe(this.onChangeAccount.bind(this));
    }

    public getServiceProviders(serviceType: string): Promise<Array<string>> {
        const account: Account = this.account;
        const serviceFinderId: string = this.serviceFinderId;
        const profileManager: ProfileManager = this.profileManager;
        const dataRequestManager: DataRequestManager = this.dataRequestManager;
        return this.dataRequestManager.requestPermissions(this.serviceFinderId, [serviceType])
            .then(function (ret: number) {
                if (ret > 0) {
                    return dataRequestManager.getRequests(account.publicKey, serviceFinderId)
                        .then(function (requests: Array<DataRequest>) {
                            if (requests.length > 0) {
                                const request: DataRequest = requests[requests.length - 1];
                                return profileManager.getAuthorizedData(request.toPk, request.responseData)
                                    .then((map: Map<string, string>) => map.get(serviceType))
                                    .then((json: string) => JSON.parse(json))
                            } else {
                                return new Array<string>();
                            }
                        })
                } else {
                    return new Array<string>();
                }
            });
    }

    public getServiceInfo(spid: string): Promise<ServiceInfo> {

    }

    public subscribe(serviceInfo: ServiceInfo): Promise<boolean> {

    }

    public announceService(service: Service) {

    }

    public getProcessedData(spid: string): Promise<string> {

    }

    public getSubscriptions(): Map<string, ServiceInfo> {

    }

    private onChangeAccount(account: Account) {
        this.account = account;
    }

}

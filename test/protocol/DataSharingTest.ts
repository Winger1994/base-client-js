/**
 * Test the data sharing flow between users, service provider and business
 */
import Base, { SubscriptionManagerImpl, Offer, CompareAction, SearchRequest, OfferSearch, ShareDataRepository, HttpTransportImpl, ShareDataRepositoryImpl, OfferShareDataRepositoryImpl, OfferShareDataRepository, OfferShareData, TokenPointer, WalletManagerImpl } from '../../src/Base';
import Account from '../../src/repository/models/Account';
import { ServiceInfo, Service } from '../../src/repository/service/Service';
import GeneralService from '../../src/repository/service/GeneralService';
import DataRequest from '../../src/repository/models/DataRequest';
import { OfferPrice } from '../../src/repository/models/OfferPrice';
import { OfferPriceRules } from '../../src/repository/models/OfferPriceRules';
import { AccessRight } from '../../src/utils/keypair/Permissions';
import SharePointer from '../../src/repository/offer/SharePointer';

const should = require('chai')
    .use(require('chai-as-promised'))
    .should();

const host = 'http://localhost:8080';
const site = 'localhost';
const sig = 'unique message for sig';

describe('Data sharing test between user, service provider and business', async () => {
    const passPhraseUser: string = 'data sharing user';
    const passPhraseService: string = 'data sharing service';
    const passPhraseBusiness: string = 'data sharing business';
    const baseUser: Base = new Base(host, site);
    const baseService: Base = new Base(host, site);
    const baseBusiness: Base = new Base(host, site);

    let accUser: Account;
    let accService: Account;
    let accBusiness: Account;

    let shareDataRepoUser: ShareDataRepository;
    let shareDataRepoService: ShareDataRepository;
    let offerShareDataRepoBusiness: OfferShareDataRepository;
    let shareDataRepoBusiness: ShareDataRepository;

    let serviceInfo: ServiceInfo;
    let service: Service;

    function offerFactory(): Offer {
        const offerTags = new Map<String, String>([
            ['bank', 'credit card']
        ]);
        const compareUserTag = new Map<String, String>([
            ['gpa', '4.0']
        ]);
        const rules = new Map<String, CompareAction>([
            ['gpa', CompareAction.EQUALLY]
        ]);
        const offer = new Offer(
            'it is offer description',
            'it is title of offer',
            '', '1', offerTags, compareUserTag, rules
        );
        offer.offerPrices = [
            new OfferPrice(
                0, 'special price for individual with gpa 4.0', '1.5', [
                    new OfferPriceRules(0, 'gpa', '4.0', CompareAction.EQUALLY),
                ]
            )
        ];
        return offer;
    }

    function requestFactory(): SearchRequest {
        return new SearchRequest(new Map([
            ['bank', 'credit card'],
        ]));

    }

    beforeEach(async () => {
        accUser = await baseUser.accountManager.authenticationByPassPhrase(passPhraseUser, sig);
        accService = await baseService.accountManager.authenticationByPassPhrase(passPhraseService, sig);
        accBusiness = await baseBusiness.accountManager.authenticationByPassPhrase(passPhraseBusiness, sig);
        shareDataRepoUser = new ShareDataRepositoryImpl(
            baseUser.dataRequestManager,
            baseUser.profileManager,
            new OfferShareDataRepositoryImpl(new HttpTransportImpl(host), baseUser.accountManager, baseUser.profileManager)
        );
        shareDataRepoService = new ShareDataRepositoryImpl(
            baseService.dataRequestManager,
            baseService.profileManager,
            new OfferShareDataRepositoryImpl(new HttpTransportImpl(host), baseService.accountManager, baseService.profileManager)
        );
        offerShareDataRepoBusiness = new OfferShareDataRepositoryImpl(new HttpTransportImpl(host), baseBusiness.accountManager, baseBusiness.profileManager);
        shareDataRepoBusiness = new ShareDataRepositoryImpl(
            baseBusiness.dataRequestManager,
            baseBusiness.profileManager,
            offerShareDataRepoBusiness
        );

        serviceInfo = new ServiceInfo(
            'gpa',
            accService.publicKey,
            'GPA certification',
            ['courses']
        );
        service = new GeneralService(serviceInfo, baseService.profileManager, baseService.dataRequestManager);
        // User add a fake eth_wallets field into own storage 
        let updates: Map<string, string> = new Map();
        updates.set(WalletManagerImpl.DATA_KEY_ETH_WALLETS, 'fake');
        await baseUser.profileManager.updateData(updates);
    });

    it('Announce service', async () => {
        await baseService.subscriptionManager.announceService(service);
        // Check 'service' entry in the storage
        const data: Map<string, string> = await baseService.profileManager.getData();
        data.get(SubscriptionManagerImpl.KEY_SERVICE_INFO).should.be.equal(service.toJsonString());
    });

    it('User subscribe to service', async () => {
        let updates: Map<string, string> = new Map();
        updates.set('courses', 'data');
        await baseUser.profileManager.updateData(updates);
        const promise = baseUser.subscriptionManager.subscribe(serviceInfo).then(async (status) => {
            status.should.be.equal(true);
            const dataRequests: Array<DataRequest> = await baseUser.dataRequestManager.getRequests(accUser.publicKey, accService.publicKey);
            dataRequests.length.should.be.equal(1);
            const data: Map<string, string> = await baseUser.profileManager.getAuthorizedData(dataRequests[0].toPk, dataRequests[0].responseData);
            data.has(accUser.publicKey).should.be.equal(true);
        })
        const waitTimer = setTimeout(
            async () => {
                const dataRequests: Array<DataRequest> = await baseService.dataRequestManager.getRequests(accService.publicKey, '');
                dataRequests.length.should.be.equal(1);
                const uid: string = dataRequests[0].toPk;
                await service.addSubscriber(uid);
                await service.updateData(uid, '4.0');
            },
            10000);
        await promise;
    });

    it('Business create offer & user create search request, match and grant permission', async () => {
        // Business create offer
        const offer = offerFactory();
        console.log('before create offer');
        const businessOffer = await baseBusiness.offerManager.saveOffer(offer);
        businessOffer.id.should.exist;
        console.log('create offer');
        // User create search request
        const request = requestFactory();
        const userSearchRequest = await baseUser.searchManager.createRequest(request);
        // Match offer and search request
        const offerSearch = new OfferSearch(userSearchRequest.id, businessOffer.id);
        await baseUser.searchManager.addResultItem(offerSearch);
        const searchResults = await baseUser.searchManager.getSearchResult(userSearchRequest.id);
        const searchResult: OfferSearch = searchResults[0].offerSearch;
        // Select one OfferPrice object
        const onePrice = businessOffer.offerPrices[0];
        const acceptedFields = onePrice.getFieldsForAcception(AccessRight.R);
        // User Grant permission for offer
        console.log('user grant permission for offer');
        const promise = shareDataRepoUser.grantAccessForOffer(searchResult.id, accBusiness.publicKey, acceptedFields, onePrice.id, accUser.publicKey).then(async (status) => {
            status.should.be.equal(true);
            // Check the TokenPointer is written into the storage
            const tokenPointerKey: string = TokenPointer.generateKey(accBusiness.publicKey, accService.publicKey);
            const data: Map<string, string> = await baseUser.profileManager.getData();
            data.has(tokenPointerKey).should.be.equal(true);
            console.log(data.get(tokenPointerKey));
        });
        setTimeout(
            async () => {
                // Get all granted but not yet accepted offer
                console.log();
                const offerShareDatas: Array<OfferShareData> = await offerShareDataRepoBusiness.getShareData(accBusiness.publicKey, false);
                console.log('business get not yet accepted share data');
                console.log(offerShareDatas);
                offerShareDatas.length.should.be.equal(1);
                const offerShareData: OfferShareData = offerShareDatas[0];
                const dataFields: Map<string, string> = await baseBusiness.profileManager.getAuthorizedData(offerShareData.clientId, offerShareData.clientResponse);
                console.log('business get granted fields');
                console.log(dataFields);
                const promise = shareDataRepoBusiness.acceptShareData(dataFields, offerShareData.clientId, accBusiness.publicKey, offerShareData.offerSearchId, offerShareData.worth).then((data) => {
                    // Include the eth_wallets entry
                    data.size.should.be.equal(2);
                    data.get('gpa').should.be.equal('4.0');
                });
                await promise;
            },
            5000);
        setTimeout(
            async () => {
                // Check granted TokenPointer from user, then write & share SharePointer with business
                const dataRequests: Array<DataRequest> = await baseService.dataRequestManager.getRequests(accService.publicKey, accUser.publicKey);
                dataRequests.length.should.be.equal(1);
                const dataRequest: DataRequest = dataRequests[0];
                const data: Map<string, string> = await baseService.profileManager.getAuthorizedData(dataRequest.toPk, dataRequest.responseData);
                const tokenPointerKey: string = await TokenPointer.generateKey(accBusiness.publicKey, accService.publicKey);
                data.has(tokenPointerKey).should.be.equal(true);

                const value: string = data.get(tokenPointerKey);
                const tokenPointer: TokenPointer = JSON.parse(value);
                tokenPointer.token.bid.should.be.equal(accBusiness.publicKey);
                const promise = shareDataRepoService.shareWithBusiness(tokenPointerKey, value, accUser.publicKey).then(async (status) => {
                    // Check the SharePointer is written into the storage
                    status.should.be.equal(true);
                    const sharePointerKey: string = SharePointer.generateKey(accUser.publicKey, accBusiness.publicKey);
                    const data: Map<string, string> = await baseService.profileManager.getData();
                    data.has(sharePointerKey).should.be.equal(true);
                    console.log(data.get(sharePointerKey));
                });
                await promise;
            },
            60000);
        await promise;
    });
});
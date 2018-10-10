import {store} from '../store/store';
import * as Actions from '../store/constants';
const Store = window.require('electron-store');
const arkidStorage = new Store({name:'arkid'});
const abiStorage = new Store({name:'abi'});

export default class StorageService {

    constructor(){}

    static setArkId(arkid){
        return arkidStorage.set('arkid', arkid);
    };

    static getArkId() {
        return arkidStorage.get('arkid');
    }

    static removeArkId(){
        arkidStorage.clear();
        abiStorage.clear();
        store.commit(Actions.SET_ARKID, null);
        store.commit(Actions.SET_SEED, '');
        return true;
    }

    static cacheABI(contractName, chainId, abi){
        return abiStorage.set(`abis.${contractName}_${chainId}`, abi);
    }

    static getCachedABI(contractName, chainId){
        return abiStorage.get(`abis.${contractName}_${chainId}`);
    }

    static getSalt(){
        return arkidStorage.get('salt') || 'SALT_ME';
    }

    static setSalt(salt){
        return arkidStorage.set('salt', salt);
    }
}

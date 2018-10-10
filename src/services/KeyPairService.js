import {BlockchainsArray, Blockchains} from '../models/Blockchains';
import PluginRepository from '../plugins/PluginRepository'
import * as Actions from '../store/constants';

import PopupService from '../services/PopupService'
import {Popup} from '../models/popups/Popup'

import {store} from '../store/store';
import Keypair from '../models/Keypair';

export default class KeyPairService {

    static isValidPrivateKey(keypair){

        PluginRepository.signatureProviders().map(provider => {

        });
        const plugin = PluginRepository.plugin(keypair.blockchain);
        return plugin.validPrivateKey(keypair.privateKey);
    }

    /***
     * Tries to make a keypair in place from a private key
     * @param keypair
     * @returns {Promise.<void>}
     */
    static async makePublicKey(keypair){
        return new Promise((resolve) => {
            setTimeout(() => {
                if(keypair.privateKey.length < 50) {
                    resolve(false);
                    return false;
                }

                let publicKey = '';

                BlockchainsArray.map(blockchainKV => {
                    try {
                        if(!publicKey.length) {
                            const blockchain = blockchainKV.value;

                            const plugin = PluginRepository.plugin(blockchain);
                            if (plugin && plugin.validPrivateKey(keypair.privateKey)) {
                                publicKey = plugin.privateToPublic(keypair.privateKey, keypair.fork);
                                keypair.blockchain = blockchain;
                            }
                        }
                    } catch(e){}
                });

                if(publicKey) keypair.publicKey = publicKey;
                resolve(true);
            },100)
        })
    }

    static async generateKeyPair(keypair, prefix = null){
        const plugin = PluginRepository.plugin(keypair.blockchain);
        if(!plugin) return false;

        plugin.randomPrivateKey().then(privateKey => {
            const publicKey = plugin.privateToPublic(privateKey, prefix);
            if(plugin.validPublicKey(publicKey, prefix) && plugin.validPrivateKey(privateKey)){
                keypair.publicKey = publicKey;
                keypair.privateKey = privateKey;
            }
        });

        return true;
    }

    static saveKeyPair(keypair, callback){
        const arkid = store.state.arkid.clone();

        if(!keypair.name.length)
            return PopupService.push(Popup.prompt('Invalid Keypair Name', 'The keypair name you have entered is invalid', 'ban', 'Okay'));
        if(arkid.keychain.getKeyPair(keypair))
            return PopupService.push(Popup.prompt('Keypair Exists', 'There is already a keypair with the key', 'ban', 'Okay'));
        if(arkid.keychain.getKeyPairByName(keypair.name))
            return PopupService.push(Popup.prompt('Keypair Exists', 'There is already a keypair with the key', 'ban', 'Okay'));

        arkid.keychain.keypairs.push(Keypair.fromJson(keypair));
        store.dispatch(Actions.SET_ARKID, arkid).then(() => callback());
    }

    static updateKeyPair(keypair, callback){
        const arkid = store.state.arkid.clone();

        if(!keypair.name.length)
            return PopupService.push(Popup.prompt('Invalid Keypair Name', 'The keypair name you have entered is invalid', 'ban', 'Okay'));

        arkid.keychain.keypairs.find(x => x.unique() === keypair.unique()).name = keypair.name;
        store.dispatch(Actions.SET_ARKID, arkid).then(() => callback());
    }

    static removeKeyPair(keypair, callback){
        const arkid = store.state.arkid.clone();
        arkid.keychain.removeKeyPair(keypair);
        store.dispatch(Actions.SET_ARKID, arkid).then(() => callback());
    }

    static getKeyPairFromPublicKey(publicKey, decrypt = false){
        const keypair = store.state.arkid.keychain.keypairs.find(x => x.publicKey === publicKey);
        if(keypair) {
            if(decrypt) keypair.decrypt(store.state.seed);
            return keypair;
        }

        const identity = store.state.arkid.keychain.identities.find(x => x.publicKey === publicKey);
        if(identity) {
            if(decrypt) identity.decrypt(store.state.seed);
            return Keypair.fromJson({
                name:identity.name,
                blockchain:Keypair.blockchain(publicKey),
                publicKey,
                privateKey:identity.privateKey
            });
        }

        return null;
    }

    static isHardware(publicKey){
        const keypair = this.getKeyPairFromPublicKey(publicKey);
        if(!keypair) throw new Error('Keypair doesnt exist on keychain');
        return keypair.external !== null;
    }

    static publicToPrivate(publicKey){
        const keypair = this.getKeyPairFromPublicKey(publicKey, true);
        if(keypair) return keypair.privateKey;
        return null;
    }

}

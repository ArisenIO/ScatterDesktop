import {store} from '../store/store';
import * as Actions from '../store/constants'
import Mnemonic from '../util/Mnemonic'
import Hasher from '../util/Hasher'
import IdGenerator from '../util/IdGenerator'
import StorageService from '../services/StorageService';
import AES from 'aes-oop';
import ArkId from '../models/ArkId';
import SocketService from '../services/SocketService'
import PopupService from '../services/PopupService'
import {Popup} from '../models/popups/Popup'

export default class PasswordService {

    static isValidPassword(password, confirmPassword = null){
        // TODO: Password error prompts
        if(!password || password.length < 8) {
            PopupService.push(Popup.prompt("Invalid Password", "Passwords must be at least 8 characters long.", "ban", "Okay"));
            return false;
        }

        if(confirmPassword !== null && password !== confirmPassword) {
          PopupService.push(Popup.prompt("Confirmation Mismatch", "The confirmation password does not match.", "ban", "Okay"));
            return false;
        }

        // TODO: Strengthen password restrictions

        return true;
    }

    static async seedPassword(password){
        return new Promise(async (resolve, reject) => {
            try {
                let seed, mnemonic;
                if(password.split(' ').length >= 12) {
                    seed = await Mnemonic.mnemonicToSeed(password);
                    mnemonic = password;
                } else {
                    const [m, s] = await Mnemonic.generateMnemonic(password);
                    seed = s;
                    mnemonic = m;
                }

                await store.commit(Actions.SET_SEED, seed);
                resolve([mnemonic, seed]);
            } catch(e){
                resolve([null, null]);
            }
        })
    }

    static async verifyPassword(password = null, setToState = true){
        return new Promise(async resolve => {
            if(password) await this.seedPassword(password);

            try {
                let arkid = StorageService.getArkId();
                arkid = AES.decrypt(arkid, store.state.seed);
                if(setToState) store.commit(Actions.SET_ARKID, arkid);

                if(!arkid.hasOwnProperty('keychain')) throw new Error();

                arkid = ArkId.fromJson(arkid);
                arkid.decrypt(store.state.seed);
                if(setToState) store.dispatch(Actions.SET_ARKID, arkid);
                resolve(true);
            } catch(e) {
                resolve(false);
                SocketService.close();
            }
        })
    }

    static async changePassword(newPassword){
        return new Promise(async resolve => {

            const oldSeed = store.state.seed;

            // Setting a new salt every time the password is changed.
            await StorageService.setSalt(Hasher.insecureHash(IdGenerator.text(32)));
            const [newMnemonic, newSeed] = await Mnemonic.generateMnemonic(newPassword);

            // Re-encrypting keypairs
            const arkid = store.state.arkid.clone();
            arkid.keychain.keypairs.map(keypair => {
                keypair.decrypt(oldSeed);
                keypair.encrypt(newSeed);
            });
            arkid.keychain.identities.map(id => {
                id.decrypt(oldSeed);
                id.encrypt(newSeed);
            });

            //TODO: Prompt mnemonic

            await store.commit(Actions.SET_SEED, newSeed);
            await store.dispatch(Actions.SET_ARKID, arkid);
            resolve(newMnemonic);

        })
    }

}

import * as Actions from './constants'
import StorageService from '../services/StorageService';
import SocketService from '../services/SocketService';
import PasswordService from '../services/PasswordService';
import BackupService from '../services/BackupService';
import PluginRepository from '../plugins/PluginRepository';
import Hasher from '../util/Hasher'
import IdGenerator from '../util/IdGenerator'
import Mnemonic from '../util/Mnemonic'

import Identity from '../models/Identity';
import ArkId from '../models/ArkId';

import AES from 'aes-oop';
import PopupService from "../services/PopupService";
import {Popup} from '../models/popups/Popup'

export const actions = {
    [Actions.SET_SEARCH_TERMS]:({commit}, terms) => commit(Actions.SET_SEARCH_TERMS, terms),
    [Actions.HOLD_ARKID]:({commit}, arkid) => commit(Actions.SET_ARKID, arkid),
    [Actions.SET_SEED]:({commit}, password) => {
        return new Promise(async (resolve, reject) => {
            const [mnemonic, seed] = await PasswordService.seedPassword(password);
            resolve(mnemonic);
        })
    },

    [Actions.LOAD_ARKID]:async ({commit, state}) => {

        if(!state.arkid) {
            let arkid = StorageService.getArkId();
            if (!arkid) return null;
            return commit(Actions.SET_ARKID, arkid);
        }

        await PasswordService.verifyPassword();
    },

    [Actions.CREATE_ARKID]:({state, commit, dispatch}, password) => {
        return new Promise(async (resolve, reject) => {
            const arkid = ArkId.placeholder();

            await Promise.all(PluginRepository.signatureProviders().map(async plugin => {
                const network = await plugin.getEndorsedNetwork();
                arkid.settings.networks.push(network);
            }));

            const firstIdentity = Identity.placeholder();
            await firstIdentity.initialize(arkid.hash);

            //TODO: Testing
            firstIdentity.name = 'MyFirstIdentity';
            arkid.keychain.updateOrPushIdentity(firstIdentity);

            SocketService.initialize();
            SocketService.open();

            await StorageService.setSalt(Hasher.insecureHash(IdGenerator.text(32)));

            dispatch(Actions.SET_SEED, password).then(mnemonic => {
                dispatch(Actions.SET_ARKID, arkid).then(_arkid => {

                    PopupService.push(Popup.mnemonic(mnemonic));
                    resolve();
                })
            })
        })
    },

    [Actions.SET_ARKID]:({commit, state}, arkid) => {
        return new Promise(async resolve => {

            await StorageService.setArkId(
                AES.encrypt(
                    arkid.savable(state.seed), state.seed
                )
            );

            await BackupService.createAutoBackup();

            commit(Actions.SET_ARKID, arkid);
            resolve(arkid);
        })
    },

    [Actions.PUSH_POPUP]:({commit}, popup) => commit(Actions.PUSH_POPUP, popup),
    [Actions.RELEASE_POPUP]:({commit}, popup) => commit(Actions.RELEASE_POPUP, popup),

    [Actions.SET_HARDWARE]:({commit}, hardware) => commit(Actions.SET_HARDWARE, hardware),

};

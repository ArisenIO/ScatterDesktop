import Vue from 'vue'
import Vuex from 'vuex';

import {mutations} from './mutations';
import {actions} from './actions';

import {PopupDisplayTypes} from '../models/popups/Popup'
import ArkId from '../models/ArkId';
import PluginRepository from '../plugins/PluginRepository'

import * as HARDWARE_STATES from '../models/hardware/constants';

Vue.use(Vuex);

const state = {
    searchTerms:'',

    seed:'',
    mnemonic:'',

    arkid:null,

    popups:[],

    hardware:null,
};

const getters = {
    // App State
    unlocked:state =>       state.arkid !== null && typeof state.arkid !== 'string' && state.arkid instanceof ArkId && !state.arkid.isEncrypted(),

    // Keychain centric
    identities:state =>     state.arkid.keychain.identities || [],
    keypairs:state =>       state.arkid.keychain.keypairs || [],
    accounts:state =>       state.arkid.keychain.accounts || [],
    permissions:state =>    state.arkid.keychain.permissions || [],
    apps:state =>           state.arkid.keychain.apps || [],
    linkedApps:state =>     state.arkid.keychain.linkedApps || [],

    // Settings
    networks:state =>       state.arkid.settings.networks || [],
    language:state =>       state.arkid.settings.language || [],
    autoBackup:state =>     state.arkid.settings.autoBackup || null,
    backupLocation:state => state.arkid.settings.backupLocation || null,
    explorers:state =>      state.arkid.settings.explorers || PluginRepository.defaultExplorers(),

    // Popups
    nextPopIn:state =>      state.popups.filter(x => x.displayType === PopupDisplayTypes.POP_IN)[0] || null,
    snackbars:state =>      state.popups.filter(x => x.displayType === PopupDisplayTypes.SNACKBAR) || [],
};

export const store = new Vuex.Store({
    state,
    getters,
    mutations,
    actions
})

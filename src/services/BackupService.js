const {remote} = window.require('electron');
import {store} from '../store/store';
import * as Actions from '../store/constants';
import {BACKUP_STRATEGIES} from '../models/Settings';
import StorageService from '../services/StorageService';
const fs = window.require('fs');

export const getFileLocation = () => remote.dialog.showOpenDialog();
export const getFolderLocation = () => remote.dialog.showOpenDialog({properties: ['openDirectory']});
const getLatestArkId = () => StorageService.getArkId();

const saveFile = (filepath) => {
    return new Promise(resolve => {
        const arkid = getLatestArkId();
        const date = new Date();
        const month = date.getUTCMonth();
        const year = date.getUTCFullYear();
        const salt = StorageService.getSalt();
        const file = arkid + '|SLT|' + salt;
        try {
            fs.writeFileSync(`${filepath}/arkid_${month}-${year}.txt`, file, 'utf-8');
            resolve(true);
        }
        catch(e) {
            console.error('Error saving file', e);
            resolve(false);
        }
    })
};

export default class BackupService {

    static async setBackupStrategy(strategy){
        const arkid = store.state.arkid.clone();
        arkid.settings.autoBackup = strategy;
        return store.dispatch(Actions.SET_ARKID, arkid);
    }

    static async createBackup(){
        const location = getFolderLocation();
        if(! location) return false;

        await saveFile(location[0]);
    }

    static async setBackupLocation(){
        const location = getFolderLocation();
        if(!location) return false;
        const arkid = store.state.arkid.clone();
        arkid.settings.backupLocation = location[0];
        return store.dispatch(Actions.SET_ARKID, arkid);
    }

    static async createAutoBackup(){
        if(!store.state.arkid || store.state.arkid.settings) return;
        const strategy = store.state.arkid.settings.autoBackup;
        if(!strategy || !strategy.length || strategy === BACKUP_STRATEGIES.MANUAL) return;

        const backupLocation = store.state.arkid.settings.backupLocation;
        if(!backupLocation || !backupLocation.length) return false;

        await saveFile(backupLocation);
    }

}

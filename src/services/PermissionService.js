import {store} from '../store/store';
import * as Actions from '../store/constants';

import Permission from '../models/Permission'
import {IdentityRequiredFields} from '../models/Identity'
import Error from '../models/errors/Error'
import Hasher from '../util/Hasher'

export default class PermissionService {

    static identityFromPermissions(origin, formatForResult = true){

        const permissions = store.state.arkid.keychain.permissions;
        const possibleId = permissions.find(x => x.isIdentityPermissionFor(origin));
        if(possibleId){
            let identityRequirements = IdentityRequiredFields.fromPermission(possibleId.identityRequirements);
            let identity = formatForResult ? possibleId.getIdentity().asOnlyRequiredFields(identityRequirements) : possibleId.getIdentity();
            if(!identity) return null;
            identity.accounts = possibleId.getAccounts().map(x => formatForResult ? x.asReturnable() : x);
            return identity;
        }
        return null;
    }

    static addIdentityOriginPermission(identity, accounts, identityRequirements, origin){
        identityRequirements = IdentityRequiredFields.fromJson(identityRequirements);
        identityRequirements = identityRequirements.forPermission();

        const arkid = store.state.arkid.clone();

        // Permission already exists
        if(arkid.keychain.permissions.find(x => x.isIdentity && x.origin === origin && x.identity === identity.publicKey)) return;

        const permission = Permission.fromAction(origin, identity, accounts, {
            identityRequirements,
            isIdentity:true
        });

        arkid.keychain.permissions.push(permission);
        store.dispatch(Actions.SET_ARKID, arkid);
    }

    static removeIdentityPermission(origin){
        const arkid = store.state.arkid.clone();
        const idPermissions = arkid.keychain.permissions.find(x => x.isIdentity && x.origin === origin);
        if(!idPermissions) return new Error('already_forgotten', "This identity does not have a permission for "+origin);
        arkid.keychain.permissions = arkid.keychain.permissions.filter(x => x.id !== idPermissions.id);
        return store.dispatch(Actions.SET_ARKID, arkid);
    }

    static async addIdentityRequirementsPermission(origin, identity, identityRequirements){
        identityRequirements = IdentityRequiredFields.fromJson(identityRequirements);

        // No need for a permission.
        if(identityRequirements.isEmpty()) return;

        identityRequirements = identityRequirements.forPermission();


        const arkid = store.state.arkid.clone();

        const permission = Permission.fromJson({
            origin, identity:identity.publicKey, identityRequirements, isIdentityRequirements:true
        });

        // Don't duplicate requirements.
        if(arkid.keychain.permissions.find(x => x.checksum() === permission.checksum())) return;

        arkid.keychain.permissions.push(permission);
        return store.dispatch(Actions.SET_ARKID, arkid);
    }

    static hasIdentityRequirementsPermission(origin, identity, identityRequirements){
        identityRequirements = IdentityRequiredFields.fromJson(identityRequirements);
        identityRequirements = identityRequirements.forPermission();

        const permission = Permission.fromJson({
            origin, identity:identity.publicKey, identityRequirements, isIdentityRequirements:true
        });

        return store.state.arkid.keychain.permissions.find(x => x.checksum() === permission.checksum());
    }

    static createActionPermission(origin, identity, accounts, whitelistData){

        const immutableActionFields = Permission.createImmutableFieldsHash(whitelistData.fields, whitelistData.props);

        const permission = Permission.fromAction(origin, identity, accounts, {
            contract:whitelistData.code,
            contractHash:whitelistData.hash || null,
            action:whitelistData.type,
            immutableActionFields,
            mutableActionFields:whitelistData.props,
            timestamp:+new Date(),
            isContractAction:true
        });


        const arkid = store.state.arkid.clone();

        if(arkid.keychain.permissions.find(x => x.checksum() === permission.checksum())) return;
        return permission;
    }

    static async addActionPermissions(origin, identity, accounts, whitelists){
        if(!whitelists || !whitelists.length) return;

        const permissions = whitelists.map(whitelist =>
            PermissionService.createActionPermission(origin, identity, accounts, whitelist)
        ).filter(x => x);

        if(permissions.length){
            const arkid = store.state.arkid.clone();
            permissions.map(x => arkid.keychain.permissions.push(x));
            await store.dispatch(Actions.SET_ARKID, arkid);
        }
    }

    static hasActionPermission(origin, identity, accounts, message){

        const contract = message.code;
        const action = message.type;
        const contractHash = null;

        const permission = Permission.fromAction(origin, identity, accounts, {
            contract,
            contractHash,
            action,
            isContractAction:true
        });

        const matchingPermissions = store.state.arkid.keychain.permissions.filter(x => x.checksum() === permission.checksum());

        if(!matchingPermissions.length) return false;

        return matchingPermissions.some(perm => {
            const immutableActionFields = Permission.createImmutableFieldsHash(message.data, perm.mutableActionFields);
            return perm.immutableActionFields === immutableActionFields;
        });
    }

    static isWhitelistedTransaction(origin, identity, accounts, messages, requiredFields){
        requiredFields = IdentityRequiredFields.fromJson(requiredFields);

        // Checking for permissions
        const whitelistedActions = messages.every(message =>
            PermissionService.hasActionPermission(origin, identity, accounts, message)
        );


        // Not all actions are whitelisted
        if(!whitelistedActions) return false;

        // Dont need to check for required fields
        if(requiredFields.isEmpty()) return true;

        return PermissionService.hasIdentityRequirementsPermission(origin, identity, requiredFields);
    }

}

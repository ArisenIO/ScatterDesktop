import Plugin from '../Plugin';
import * as PluginTypes from '../PluginTypes';
import {Blockchains} from '../../models/Blockchains'
import Network from '../../models/Network'
import Account from '../../models/Account'
import KeyPairService from '../../services/KeyPairService'
import Rsn from 'arisenjsv1'
let {ecc, Fcbuffer} = Rsn.modules;
import ObjectHelpers from '../../util/ObjectHelpers'
import * as ricardianParser from 'arisen-rc-parser';
import {Popup} from '../../models/popups/Popup'
import PopupService from '../../services/PopupService'
import StorageService from '../../services/StorageService'
import ApiService from '../../services/ApiService'
import * as Actions from '../../models/api/ApiActions';
import {store} from '../../store/store'


let cachedInstances = {};
const getCachedInstance = network => {
    if(cachedInstances.hasOwnProperty(network.unique())) return cachedInstances[network.unique()];
    else {
        const rsn = Rsn({httpEndpoint:`${network.fullhost()}`, chainId:network.chainId});
        cachedInstances[network.unique()] = rsn;
        return rsn;
    }
}


const getAccountsFromPublicKey = (publicKey, network) => {
    return Promise.race([
        new Promise(resolve => setTimeout(() => resolve([]), 10000)),
        new Promise((resolve, reject) => {
            const rsn = getCachedInstance(network);
            rsn.getKeyAccounts(publicKey).then(res => {
                if(!res || !res.hasOwnProperty('account_names')){ resolve([]); return false; }

                Promise.all(res.account_names.map(name => rsn.getAccount(name).catch(e => resolve([])))).then(multires => {
                    let accounts = [];
                    multires.map(account => {
                        account.permissions.map(perm => {
                            if(!!perm.required_auth.keys.find(x => x.key === publicKey))
                                accounts.push({name:account.account_name, authority:perm.perm_name})
                        });
                    });
                    resolve(accounts)
                }).catch(e => resolve([]));
            }).catch(e => resolve([]));
        })
    ])
};

const EXPLORERS = [
    {
        name:'ArisenExplorer.com',
        account:account => `https://arisenexplorer.com/account/${account.name}`,
        transaction:id => `https://arisenexplorer.com/transaction/${id}`,
        block:id => `https://arisenexplorer.com/block/${id}`
    },
    {
        name:'Arisen.Network',
        account:account => `https://explore.arisen.network/account/${account.name}`,
        transaction:id => `https://explpre.arisen.network/tx/${id}`,
        block:id => `https://explore.arisen.network/block/${id}`
    }
];




export default class RSN extends Plugin {

    constructor(){ super(Blockchains.ARISEN, PluginTypes.BLOCKCHAIN_SUPPORT) }
    explorers(){ return EXPLORERS; }
    accountFormatter(account){ return `${account.name}@${account.authority}` }
    returnableAccount(account){ return { name:account.name, authority:account.authority, publicKey:account.publicKey, blockchain:Blockchains.ARISEN }}

    forkSupport(){
        return true;
    }

    async getEndorsedNetwork(){
        return new Promise((resolve, reject) => {
            resolve(new Network(
                'Arisen Mainnet', 'https',
                'greatchain.arisennodes.io',
                443,
                Blockchains.ARISEN,
                'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906'
            ));
        });
    }

    async isEndorsedNetwork(network){
        const endorsedNetwork = await this.getEndorsedNetwork();
        return network.hostport() === endorsedNetwork.hostport();
    }

    async getChainId(network){
        const rsn = Rsn({httpEndpoint:`${network.protocol}://${network.hostport()}`});
        return rsn.getInfo({}).then(x => x.chain_id || '').catch(() => '');
    }

    accountsAreImported(){ return true; }
    getImportableAccounts(keypair, network){
        return new Promise((resolve, reject) => {
            getAccountsFromPublicKey(keypair.publicKey, network).then(accounts => {
                resolve(accounts.map(account => Account.fromJson({
                    name:account.name,
                    authority:account.authority,
                    publicKey:keypair.publicKey,
                    keypairUnique:keypair.unique(),
                    networkUnique:network.unique(),
                })))
            }).catch(e => resolve([]));
        })
    }

    privateToPublic(privateKey, prefix = null){ return ecc.PrivateKey(privateKey).toPublic().toString(prefix ? prefix : Blockchains.ARISEN.toUpperCase()); }
    validPrivateKey(privateKey){ return ecc.isValidPrivate(privateKey); }
    validPublicKey(publicKey, prefix = null){ return ecc.PublicKey.fromStringOrThrow(publicKey, prefix ? prefix : Blockchains.ARISEN.toUpperCase()); }
    randomPrivateKey(){ return ecc.randomKey(); }
    conformPrivateKey(privateKey){ return privateKey.trim(); }
    convertsTo(){ return []; }
    from_eth(privateKey){
        return ecc.PrivateKey.fromHex(Buffer.from(privateKey, 'hex')).toString();
    }

    actionParticipants(payload){
        return ObjectHelpers.flatten(
            payload.messages
                .map(message => message.authorization
                    .map(auth => `${auth.actor}@${auth.permission}`))
        );
    }

    async accountData(account, network){
        const rsn = getCachedInstance(network);
        return Promise.race([
            new Promise(resolve => setTimeout(() => resolve(null), 2000)),
            rsn.getAccount(account.name)
        ])
    }

    async balanceFor(account, network, tokenAccount, symbol){
        const rsn = getCachedInstance(network);

        const balances = await rsn.getTableRows({
            json:true,
            code:tokenAccount,
            scope:account.name,
            table:'accounts',
            limit:500
        }).then(res => res.rows).catch(() => []);

        const row = balances.find(row => row.balance.split(" ")[1].toLowerCase() === symbol.toLowerCase());
        return row ? row.balance.split(" ")[0] : 0;
    }

    async historyFor(account, network){
        const rsn = getCachedInstance(network);
        return await rsn.getActions(account.name).then(histories => {
            return histories.actions.map(x => {
                return {
                    blockchain:Blockchains.ARISEN,
                    account:account.unique(),
                    timestamp:+new Date(x.block_time),
                    trx:x.action_trace.trx_id,
                    data:{
                        contract:x.action_trace.act.account,
                        action:x.action_trace.act.name,
                        params:x.action_trace.act.data
                    }
                }
            });
        });
    }

    async fetchTokens(tokens){
        tokens.push({symbol:'RSN', account:'arisen.token', name:'RSN'});
        const rsnTokens = await fetch("https://raw.githubusercontent.com/arisenio/arisen-airdrops/master/tokens.json").then(res => res.json()).catch(() => []);
        rsnTokens.map(token => {
            if(!tokens.find(x => `${x.symbol}:${x.account}` === `${token.symbol}:${token.account}`)) tokens.push(token);
        });
    }



    async passThroughProvider(payload, account, network, rejector){
        return new Promise(async resolve => {
            payload.messages = await this.requestParser(payload, Network.fromJson(network));
            payload.identityKey = store.state.arkid.keychain.identities[0].publicKey;
            const request = {
                payload,
                origin:'Internal ArisenID Transfer',
                blockchain:'rsn',
                requiredFields:{},
                type:Actions.REQUEST_SIGNATURE,
                id:1,
            }

            PopupService.push(Popup.popout(request, async ({result}) => {
                if(!result || (!result.accepted || false)) return rejector({error:'Could not get signature'});

                let signature = null;
                if(KeyPairService.isHardware(account.publicKey)){
                    const keypair = KeyPairService.getKeyPairFromPublicKey(account.publicKey);
                    signature = await keypair.external.interface.sign(account.publicKey, payload, payload.abi, network);
                } else signature = await this.signer({data:payload.buf}, account.publicKey, true);

                if(!signature) return rejector({error:'Could not get signature'});

                resolve(signature);
            }));
        })
    }


    async stakeOrUnstake(account, cpu, net, network, staking = true){
        return new Promise(async (resolve, reject) => {
            const signProvider = payload => this.passThroughProvider(payload, account, network, reject);

            const rsn = Rsn({httpEndpoint:network.fullhost(), chainId:network.chainId, signProvider});
            if(staking) resolve(rsn.delegatebw(account.name, account.name, net, cpu, 0, { authorization:[account.formatted()] })
                .catch(error => ({error:JSON.parse(error).error.details[0].message.replace('assertion failure with message:', '').trim()}))
                .then(res => res));

            else resolve(rsn.undelegatebw(account.name, account.name, net, cpu, { authorization:[account.formatted()] })
                .catch(error => ({error:JSON.parse(error).error.details[0].message.replace('assertion failure with message:', '').trim()}))
                .then(res => res));
        })
    }

    async buyOrSellRAM(account, bytes, network, buying = true){
        return new Promise(async (resolve, reject) => {
            const signProvider = payload => this.passThroughProvider(payload, account, network, reject);

            const rsn = Rsn({httpEndpoint:network.fullhost(), chainId:network.chainId, signProvider});
            if(buying) resolve(rsn.buyrambytes(account.name, account.name, bytes, { authorization:[account.formatted()] })
                .catch(error => ({error:JSON.parse(error).error.details[0].message.replace('assertion failure with message:', '').trim()}))
                .then(res => res));

            else resolve(rsn.sellram(account.name, bytes, { authorization:[account.formatted()] })
                .catch(error => ({error:JSON.parse(error).error.details[0].message.replace('assertion failure with message:', '').trim()}))
                .then(res => res));
        })
    }

    async transfer(account, to, amount, network, tokenAccount, symbol, memo, promptForSignature = true){
        return new Promise(async (resolve, reject) => {
            const signProvider = promptForSignature
                ? payload => this.passThroughProvider(payload, account, network, reject)
                : payload => this.signer(payload, account.publicKey);

            const rsn = Rsn({httpEndpoint:network.fullhost(), chainId:network.chainId, signProvider});
            const contract = await rsn.contract(tokenAccount);
            const amountWithSymbol = amount.indexOf(symbol) > -1 ? amount : `${amount} ${symbol}`;
            resolve(await contract.transfer(account.name, to, amountWithSymbol, memo, { authorization:[account.formatted()] })
                .catch(error => {
                    console.log('error', error);
                    return {error:JSON.parse(error).error.details[0].message.replace('assertion failure with message:', '').trim()}
                })
                .then(result => result));
        })
    }

    async signer(payload, publicKey, arbitrary = false, isHash = false){
        const privateKey = KeyPairService.publicToPrivate(publicKey);
        if (!privateKey) return;

        if (arbitrary && isHash) return ecc.Signature.signHash(payload.data, privateKey).toString();
        return ecc.sign(Buffer.from(arbitrary ? payload.data : payload.buf, 'utf8'), privateKey);
    }

    async requestParser(signargs, network){
        const rsn = getCachedInstance(network);

        const contracts = signargs.transaction.actions.map(action => action.account)
            .reduce((acc, contract) => {
                if(!acc.includes(contract)) acc.push(contract);
                return acc;
            }, []);

        const staleAbi = +new Date() - (1000 * 60 * 60 * 24 * 2);
        const abis = {};

        await Promise.all(contracts.map(async contractAccount => {
            const cachedABI = await StorageService.getCachedABI(contractAccount, network.chainId);

            if(cachedABI === 'object' && cachedABI.timestamp > +new Date((await rsn.getAccount(contractAccount)).last_code_update))
                abis[contractAccount] = rsn.fc.abiCache.abi(contractAccount, cachedABI.abi);

            else {
                abis[contractAccount] = (await rsn.contract(contractAccount)).fc;
                const savableAbi = JSON.parse(JSON.stringify(abis[contractAccount]));
                delete savableAbi.schema;
                delete savableAbi.structs;
                delete savableAbi.types;
                savableAbi.timestamp = +new Date();

                await StorageService.cacheABI(contractAccount, network.chainId, savableAbi);
            }
        }));

        return await Promise.all(signargs.transaction.actions.map(async (action, index) => {
            const contractAccountName = action.account;

            let abi = abis[contractAccountName];

            const typeName = abi.abi.actions.find(x => x.name === action.name).type;
            const data = abi.fromBuffer(typeName, action.data);
            const actionAbi = abi.abi.actions.find(fcAction => fcAction.name === action.name);
            let ricardian = actionAbi ? actionAbi.ricardian_contract : null;

            if(ricardian){
                const htmlFormatting = {h1:'div class="ricardian-action"', h2:'div class="ricardian-description"'};
                const signer = action.authorization.length === 1 ? action.authorization[0].actor : null;
                ricardian = ricardianParser.parse(action.name, data, ricardian, signer, htmlFormatting);
            }

            return {
                data,
                code:action.account,
                type:action.name,
                authorization:action.authorization,
                ricardian
            };
        }));
    }

    async createTransaction(actions, account, network){
        let tx = {};
        const formatContract = x => x.replace('.', '_');
        const actionOptions = { authorization:[`${account.name}@${account.authority}`] };

        const signProvider = x => {
            tx.buf = x.buf;
            tx.transaction = x.transaction;
            return [];
        };

        const options = {
            httpEndpoint:network.fullhost(),
            chainId:network.chainId,
            broadcast: false,
            sign: true,
            signProvider
        };

        const contractNames = actions.map(x => x.contract);
        const rsn = Rsn(options);

        await rsn.transaction(contractNames, contracts => {
            actions.map(action => {
                try {
                    contracts[formatContract(action.contract)][action.action](...action.params, actionOptions);
                } catch(e){
                    console.log('err', e);
                }
            });
        }, {broadcast:false}).catch(() => {});

        return tx;
    }
}

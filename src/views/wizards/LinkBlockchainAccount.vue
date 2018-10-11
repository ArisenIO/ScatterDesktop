<template>
    <section>

        <section class="panel sub-menu">

            <section class="head">
                <i class="fa fa-chevron-left" @click="$router.back()"></i>
            </section>

            <section class="items-list scrollable">
                <section class="item"
                         :class="{'active':onStep.ref === step.ref}"
                         v-for="step in steps" @click="scrollTo(step)">
                    <figure class="title">{{step.title}}</figure>
                    <figure class="description">{{step.description}}</figure>
                </section>
            </section>
        </section>


        <section class="panel display">
            <section class="head">

            </section>

            <section ref="scroller" class="selected-item scrollable">

                <section :ref="steps.SELECT_KEYPAIR.ref">
                    <figure class="name">Select a Banking Keypair</figure>
                    <section class="description">
                        Bankign Keypairs can be daunting anyway for most simple users, but when you have to keep track of random names or characters it becomes even harder.
                        ArisenID allows you to assign names to your banking keypairs so that you can organize and keep track of them easily. The name has no affect on it's use what-so-ever.
                    </section>
                    <br>
                    <sel :placeholder="'Keypair'"
                         :options="keypairs"
                         :selected="keypair"
                         :parser="(obj) => obj.name"
                         v-on:changed="keypairChanged"></sel>
                </section>

                <section v-if="isImportable && selectedNetwork" :ref="steps.FETCH_ACCOUNTS.ref" class="info-box">
                    <figure class="name">Some decentralized banking networks need you to fetch the available accounts.</figure>
                    <section class="description">
                        The {{keypair.blockchain.toUpperCase()}} decentralized banking network requires that banking keypairs have accounts on top of them.
                        Decentralized Bank Accounts can't currently be created from within ArisenID, so you'll have to create them outside of ArisenID but ArisenID will be
                        able to fetch the bank accounts for you to select them once you do.
                    </section>
                    <br>
                    <sel :selected="selectedNetwork.name"
                         :options="availableNetworks"
                         :parser="network => network.name"
                         v-on:changed="changed => bind(changed, 'selectedNetwork')" :key="1"></sel>
                    <br>
                    <btn v-on:clicked="fetchAccounts" text="Fetch Bank Accounts"></btn>
                    <br>
                    <br>
                    <b v-if="fetchedAccounts">Bank Accounts have been fetched, check below.</b>
                </section>

                <section v-if="!isImportable && selectedNetwork" :ref="steps.FETCH_ACCOUNTS.ref" class="info-box">
                    <figure class="name">Select the network to link your account to.</figure>
                    <section class="description">
                        The {{keypair.blockchain.toUpperCase()}} decentralized banking network doesn't require that you have an account on top of your Banking Keypair.
                        You only need to select the decentralized banking network you wish to link this banking keypair to.
                    </section>
                    <br>
                    <sel :selected="selectedNetwork.name"
                         :options="availableNetworks"
                         :parser="network => network.name"
                         v-on:changed="changed => bind(changed, 'selectedNetwork')" :key="1"></sel>
                </section>

                <section :ref="steps.LINK_ACCOUNT.ref" class="info-box">
                    <figure class="name">Link a Blockchain Account to a Network.</figure>
                    <section class="description">
                        When applications request a decentralized bank account from you they will specify a decentralized banking network. In order for ArisenID to know which bank accounts and banking keypairs belong to
                        which decentralized banking network you will need to link bank accounts to specific banking networks.
                        <br><br>
                        <b class="red">You don't need to manually save after linking or unlinking bank accounts. The action of linking or unlinking them is instantly saved.</b>
                    </section>

                    <section v-if="isImportable && fetchedAccounts">
                        <br>
                        <hr/>
                        <figure class="header">Available Accounts</figure>
                        <tags adder="true" v-if="filteredFetchedAccounts.length"
                              :items="filteredFetchedAccounts"
                              :parser="item => `${item.name}@${item.authority}`"
                              v-on:clicked="linkAccount"></tags>
                        <figure v-else>
                            Either there are no bank accounts connected to this decentralized banking network for this public key, or the banking network could not be reached.
                        </figure>
                    </section>

                    <section v-if="!isImportable">
                        <br>
                        <btn v-on:clicked="linkKeypairToNetwork" text="Link to Decentralized Banking Network"></btn>
                    </section>

                    <section v-if="linkedAccounts.length">
                        <br>
                        <hr/>
                        <figure class="header">Linked Bank Accounts / Banking Keypairs</figure>
                        <tags :items="linkedAccounts"
                              :parser="item => item.formatted()"
                              v-on:clicked="unlinkAccount"></tags>
                    </section>
                </section>
            </section>


        </section>


    </section>
</template>

<script>
    import { mapActions, mapGetters, mapState } from 'vuex'
    import {RouteNames} from '../../vue/Routing';
    import * as Actions from '../../store/constants';

    import PluginRepository from '../../plugins/PluginRepository';
    import Keypair from '../../models/Keypair';
    import {Blockchains} from '../../models/Blockchains';
    import AccountService from '../../services/AccountService';
    import KeyPairService from '../../services/KeyPairService';
    import PopupService from '../../services/PopupService';
    import {Popup} from '../../models/popups/Popup'

    const WizardSteps = {
        SELECT_KEYPAIR:{ref:'selectkp', title:'Select Keypair', description:'Before you can import decentralized bank accounts you need to select a banking keypair.'},
        FETCH_ACCOUNTS:{ref:'fetch', title:'Fetching Accounts', description:'Some decentralized banks are different than others.'},
        LINK_ACCOUNT:{ref:'link', title:'Link Accounts to Networks', description:'ArisenID pairs bank accounts to decentralized banking networks so it knows which to ask your for.'},
    };

    export default {
        data () {return {
            steps:WizardSteps,
            onStep:WizardSteps.SELECT_KEYPAIR,
            keypair:Keypair.placeholder(),
            selectedNetwork:null,
            fetchedAccounts:false,
            availableAccounts:[],
        }},
        asyncComputed:{

        },
        computed: {
            ...mapState([
                'arkid'
            ]),
            ...mapGetters([
                'keypairs',
                'networks',
                'accounts',
            ]),
            filteredFetchedAccounts(){
                return this.availableAccounts.filter(account => !this.linkedAccounts.map(x => x.unique()).includes(account.unique()));
            },
            linkedAccounts(){
                return this.accounts.filter(account => account.keypairUnique === this.keypair.unique());
            },
            isImportable(){
                return AccountService.accountsAreImported(this.keypair);
            },
            isNew(){
                return !this.keypairs.find(x => x.publicKey === this.keypair.publicKey);
            },
            availableNetworks(){
                return this.networks.filter(network => network.blockchain === this.keypair.blockchain)
            },
        },
        mounted(){
            if(this.keypairs.length){
                this.keypair = this.keypairs[0];
                this.selectedNetwork = this.availableNetworks[0];
            } else {
                PopupService.push(Popup.prompt("You must have at least one Keypair", "You can't import decentralized bank accounts without first importing a banking keypair", "ban", "Okay"))
                this.$router.push({name:RouteNames.HELP});
            }
        },
        methods: {
            keypairChanged(keypair){
                this.keypair = keypair;
                this.selectedNetwork = this.availableNetworks[0];
            },
            async linkKeypairToNetwork(){
                await AccountService.addAccountFromKeypair(this.keypair, this.selectedNetwork);
            },
            async linkAccount(account){
                await AccountService.addAccount(account);
            },
            async unlinkAccount(account){

                PopupService.promptGuard(Popup.prompt(
                    "Removing Account Link", "This will remove this account link from the keypair and all associated permissions.",
                    "trash-o", "Unlink Account"
                ), async accepted => {
                    if(accepted) await AccountService.removeAccount(account);
                });

            },
            async fetchAccounts(){
                this.fetchedAccounts = false;
                this.availableAccounts = await AccountService.getImportableAccounts(this.keypair, this.selectedNetwork);
                this.fetchedAccounts = true;
            },
            ...mapActions([
                Actions.SET_ARKID
            ])
        }
    }
</script>

<style scoped lang="scss" rel="stylesheet/scss">
    @import "../../_variables.scss";
</style>

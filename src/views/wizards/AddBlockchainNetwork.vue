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

            <section ref="scroller" class="selected-item scrollable" v-if="network">

                <section :ref="steps.NAME.ref">
                    <figure class="name">Name this Decentralized Banking Network</figure>
                    <section class="description">
                        Decentralized Banking Networks should have readable names so that you know which one you are on. If they didn't have names you would have to see something like "https://127.0.0.1:80" instead of "Mainnet".
                        The names themselves don't affect the network in any way, they are purely organizational.
                    </section>

                    <cin placeholder="Name ( organizational )" :text="network.name" v-on:changed="changed => bind(changed, 'network.name')"></cin>
                    <br><br>
                </section>

                <section :ref="steps.BLOCKCHAIN.ref" class="info-box">
                    <figure class="name">Selecting a Decentralized Banking Network</figure>
                    <section class="description">
                        ArisenID has multi-bank support and it needs to know which decentralized banking networks belong to each network so that it knows what libraries it needs to use to interact with those
                        decentralized banking networks and which keypairs are linkable to each of those decentralized banking networks.
                    </section>
                    <br>

                    <sel :selected="network.blockchain.toUpperCase()"
                         :options="blockchains"
                         :parser="blockchain => blockchain.value.toUpperCase()"
                         v-on:changed="blockchain => network.blockchain = blockchain.value"></sel>
                </section>

                <section :ref="steps.HOST.ref" class="info-box">
                    <figure class="name">Setting a Public Bank Node</figure>
                    <section class="description">
                        Public bank nodes can be either domain names or IPs; for instance <u>greatchain.arisennodes.io</u> or <u>127.0.0.1</u>.
                    </section>

                    <cin placeholder="Host ( domain.com or IP )" :text="network.host" v-on:changed="changed => bind(changed, 'network.host')"></cin>
                </section>

                <section :ref="steps.PORT.ref" class="info-box">
                    <figure class="name">Setting the Port</figure>
                    <section class="description">
                        Public bank nodes have many ports available ( around 65,000 actually ) but generally only one of them will be open to exposing the decentralized bank's network to you.
                        Most of the times the ports will be default ( 80 for HTTP, and 443 for HTTPS ) unless otherwise specified specifically. If someone gives you a node URL like
                        <u>https://greatchain.arisennodes.io</u> then the implied port is 443. However if someone gives you the URL <u>https://greatchain.arisennodes.io:8883</u> then the port is 8883.
                        <br><br>
                        <b class="red">Ports are always numbers.</b>
                    </section>

                    <cin placeholder="Port" type="number" :text="network.port" v-on:changed="changed => bind(changed, 'network.port')"></cin>
                </section>

                <section :ref="steps.PROTOCOL.ref" class="info-box">
                    <figure class="name">HTTP or HTTPS?</figure>
                    <section class="description">
                        When you set up a new decentralized banking network make sure to select the proper <i>protocol</i>, otherwise the decentralized bank you're attempting to connect to will not be reachable.
                    </section>

                    <btn text="http" :secondary="network.protocol !== 'http'" v-on:clicked="changeProtocol('http')"></btn>
                    <btn text="https" :secondary="network.protocol !== 'https'" v-on:clicked="changeProtocol('https')"></btn>
                </section>

                <section :ref="steps.CHAIN_ID.ref" class="info-box">
                    <figure class="name">Getting and Setting the Decentralized Bank ID</figure>
                    <section class="description">
                        Decentralized Bank IDs are used to group networks together in ArisenID. You really only want one network per Decentralized Bank ID, and all your accounts on that decentralized banking network should be linked to that network.
                        If the network you have linked a blockchain account or banking keypair to does not have a Decentralized Bank ID and an application is looking for a network with that Decentralized Bank ID it will not be available,
                        even if the network's host and port are the same.
                    </section>

                    <cin placeholder="Decentralized Bank ID" :text="network.chainId"
                         :dynamic-button="'chain'" dynamic-tooltip="Fetch Decentralized Bank ID" v-on:dynamic="fetchChainId" v-on:changed="changed => bind(changed, 'network.chainId')"></cin>
                </section>

                <section :ref="steps.SAVE.ref" class="info-box">
                    <figure class="name">Saving Decentralized Banking Networks</figure>
                    <section class="description">
                        You normally don't have to do this since decentralized banking networks auto-save. However if a decentralized banking network doesn't have a name and a port it will not save, so keep that in mind.
                    </section>

                    <btn text="Save" v-on:clicked="save"></btn>
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
    import Network from '../../models/Network';
    import {Blockchains, BlockchainsArray} from '../../models/Blockchains';
    import PopupService from '../../services/PopupService';
    import {Popup} from '../../models/popups/Popup'



    const WizardSteps = {
        NAME:{ref:'name', title:'Name this Decentralized Banking Network', description:'Names are purely organizational, but good to have.'},
        BLOCKCHAIN:{ref:'blockchain', title:'Selecting a Blockchain', description:'ArisenID needs to know what blockchain this network supports.'},
        HOST:{ref:'host', title:'Setting the Public Bank Node', description:'Public Bank Nodes are what connect us all.'},
        PORT:{ref:'port', title:'Setting the Port', description:'Hosts can have many ports, but probably only one that you need.'},
        PROTOCOL:{ref:'protocol', title:'Selecting the Protocol', description:'HTTP and HTTPS are not the same thing.'},
        CHAIN_ID:{ref:'chainid', title:'Getting the Decentralized Bank ID', description:'Decentralized Bank IDs help ArisenID group networks together.'},
        SAVE:{ref:'save', title:'Save this Decentralized Banking Network', description:'You don\'t normally do this.'},
    };

    export default {
        data () {return {
            blockchains:BlockchainsArray,
            steps:WizardSteps,
            onStep:WizardSteps.NAME,
            network:Network.placeholder(),
        }},
        computed: {
            ...mapState([
                'arkid'
            ]),
            ...mapGetters([
                'networks',
            ]),
        },
        mounted(){

        },
        methods: {
            changeProtocol(protocol){
                this.network.protocol = protocol;
                this.network.setPort();
            },
            async fetchChainId(){
                this.network.chainId = await PluginRepository.plugin(this.network.blockchain).getChainId(this.network);
            },
            save(){
                // Can't modify endorsed networks.
                if(!this.network.name.length) return false;
                if(!this.network.host.length) return false;

                this.network.setPort();

                const otherNetworks = this.networks.filter(x => x.id !== this.network.id);

                if(otherNetworks.find(x => x.name.toLowerCase() === this.network.name.toLowerCase()))
                    return PopupService.push(Popup.snackbar("A network with this name already exists", "ban"));

                if(otherNetworks.find(x => x.chainId === this.network.chainId))
                    return PopupService.push(Popup.snackbar("A network with this chain id already exists", "ban"));

                const arkid = this.arkid.clone();
                arkid.settings.updateOrPushNetwork(this.network);
                this[Actions.SET_ARKID](arkid);
                PopupService.push(Popup.snackbar("Network Saved!", "check"));
                this.$router.push({name:RouteNames.BLOCKCHAINS});
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

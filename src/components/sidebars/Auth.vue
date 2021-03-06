<template>
    <aside class="auth">
        <section class="panel">

            <section class="logo-container">
                <img width="330" src="../../assets/icon.png" />

            </section>

            <section class="inputs" v-if="isNewArisenID">
                <cin placeholder="Password" type="password" v-on:enter="create" :text="password" v-on:changed="changed => bind(changed, 'password')"></cin>
                <cin placeholder="Confirm Password" type="password" v-on:enter="create" :text="confirmPassword" v-on:changed="changed => bind(changed, 'confirmPassword')"></cin>
                <btn class="dropped" v-on:clicked="create" text="Create new ArisenID" full="true" large="true"></btn>
                <btn text="Import from Backup" v-on:clicked="importBackup" full="true"></btn>
            </section>

            <section class="inputs" v-else>
                <cin placeholder="Password" type="password" :text="password" v-on:enter="unlock" v-on:changed="changed => bind(changed, 'password')"></cin>
                <btn v-on:clicked="unlock" text="Unlock ArisenID" full="true" large="true"></btn>
            </section>


        </section>
    </aside>
</template>

<script>
    import { mapActions, mapGetters, mapState } from 'vuex'
    import * as Actions from '../../store/constants';
    import {RouteNames} from '../../vue/Routing'

    import SocketService from '../../services/SocketService'
    import BackupService, {getFileLocation} from '../../services/BackupService'
    import PasswordService from '../../services/PasswordService'
    import StorageService from '../../services/StorageService'
    import PopupService from "../../services/PopupService";
    import {Popup} from '../../models/popups/Popup'
    const fs = window.require('fs');

    export default {
        name: 'Auth',
        data () {return {
            password:'',
            confirmPassword:'',
        }},
        computed: {
            isNewArisenID(){
                return this.arkid === null;
            },
            ...mapState([
                'arkid'
            ])
        },
        mounted(){
            this.password = '';
            this.confirmPassword = '';
        },
        methods:{
            async create(){
                if(!PasswordService.isValidPassword(this.password, this.confirmPassword)) return false;
                await this[Actions.CREATE_ARKID](this.password);
                this.$router.push({name:RouteNames.ONBOARDING});
            },
            async unlock(){
                await this[Actions.SET_SEED](this.password);
                await this[Actions.LOAD_ARKID]();

                const failed = () => {
                    console.log('failed');
                    PopupService.push(Popup.snackbar("Bad Password", "ban"))
                };

                if(typeof this.arkid === 'object' && !this.arkid.isEncrypted()){
                    SocketService.initialize();
                    SocketService.open();
                    this.$router.push({name:RouteNames.IDENTITIES});
                } else {
                    failed();
                }
            },
            importBackup(){
                const file = getFileLocation()[0];
                if(!file) return;

                fs.readFile(file, 'utf-8', (err, data) => {
                    if(err) return alert("Could not read the backup file.");

                    const [obj, salt] = data.split('|SLT|');
                    if(!obj || !salt) return alert("Error parsing backup");

                    StorageService.setSalt(salt);
                    StorageService.setArisenID(obj);
                    location.reload();
                });
            },
            ...mapActions([
                Actions.SET_SEED,
                Actions.CREATE_ARKID,
                Actions.LOAD_ARKID
            ])
        }
    }
</script>

<style scoped lang="scss" rel="stylesheet/scss">
    @import "../../_variables";

    .auth {
        width:450px;
        float:left;

        .logo-container {
            padding:120px 80px;

            .logo {
                font-size:68px;
                line-height:60px;
                color:$light-blue;
            }

            .tagline {
                font-size:14px;
                color:$mid-dark-grey;
            }
        }

        .inputs {
            padding:0 80px;

            .auth-text {
                font-size:13px;
            }

            .dropped {
                margin-top:30px;
            }
        }
    }

</style>

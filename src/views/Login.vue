<template>
    <section class="login">
        <figure class="bg"></figure>
    </section>
</template>

<script>
    import { mapActions, mapGetters, mapState } from 'vuex'

    export default {
        name: 'Login',
        data () {return {

        }},
        computed:{
            ...mapState([
                'arkid'
            ]),
            ...mapGetters([
                'accounts',
                'networks',
            ])
        },
        mounted(){

        }
    }
</script>

<style scoped lang="scss" rel="stylesheet/scss">
    @import "../_variables.scss";

    .login {
        position: relative;
        height:100vh;
        width:100%;
        -webkit-app-region: drag;

        .bg {
            position:absolute;
            top:0; bottom:0; left:0; right:0;
            background:url(https://github.com/ArisenIO/arisen-media/raw/master/bkgd.jpeg);
            background-size:cover;
        }
    }

</style>

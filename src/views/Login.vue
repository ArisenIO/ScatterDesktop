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
            background:url(https://images.unsplash.com/photo-1464660756002-dd9f9a92b01b?ixlib=rb-0.3.5&s=841ae36458658792bfa2af8af7f7f537&auto=format&fit=crop&w=3434&q=80);
            background-size:cover;
        }
    }

</style>

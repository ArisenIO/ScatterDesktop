import {Blockchains} from '../models/Blockchains';

const cmc = x => `https://api.coinmarketcap.com/v2/ticker/${x}/`

export default class PriceService {

    static getPriceFor(symbol, blockchain = Blockchains.ARISEN){
        if(typeof this[symbol] === 'undefined') return 0;

        return this[symbol](blockchain);
    }

    static RSN(){
        return fetch(cmc(1765)).then(x => x.json()).then(x => x.data.quotes.USD.price);
    }

}

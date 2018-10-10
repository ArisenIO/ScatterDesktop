
export const Blockchains = {
    ARISEN:'rsn',
    ETH:'eth'
};

export const BlockchainsArray =
    Object.keys(Blockchains).map(key => ({key, value:Blockchains[key]}));

export const blockchainName = x => {
    switch(x){
        case Blockchains.ARISEN: return 'RSN';
        case Blockchains.ETH: return 'Ethereum';
    }
}

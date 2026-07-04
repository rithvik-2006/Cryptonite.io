export interface Token {
    tokenAddress: string;
    ticker: string;
    name: string;
    chain: string;
    dex: string;
    protocol: string;
    currentPrice: number;
    marketCap: number;
    liquidity: number;
    fdv: number;
    volume24h: number;
    transactions: number;
    buys: number;
    sells: number;
    priceChange: number;
    volumeChange: number;
    liquidityChange: number;
    timestamp: number;
    source: string;
    confidence: number;
    dataFreshness: number;
}

export interface MarketTick {
    tokenAddress: string;
    chain: string;
    dex: string;
    price: number;
    liquidity: number;
    volume24h: number;
    timestamp: number;
    source: string;
    confidence: number;
}

export interface Trade {
    tradeId: string;
    tokenAddress: string;
    chain: string;
    dex: string;
    tradeType: 'BUY' | 'SELL';
    price: number;
    amount: number;
    timestamp: number;
    maker: string;
    taker: string;
}

// Redis Pub/Sub events
export enum RedisTopics {
    MARKET_UPDATE = 'market:update',
    MARKET_NEW = 'market:new',
    MARKET_PRICE = 'market:price',
    MARKET_LIQUIDITY = 'market:liquidity',
    MARKET_VOLUME = 'market:volume',
}

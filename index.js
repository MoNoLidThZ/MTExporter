const express = require('express');
const bodyParser = require('body-parser');
const Redis = require('ioredis');
const client = require('prom-client');

const app = express();
const redis = new Redis({
  host: '127.0.0.1',
  port: 6379,
  password: 'myAwesomeEncode2012',
  db: 2
});

app.use(bodyParser.urlencoded({ extended: true }));

// Prometheus Registry
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Account Metrics
const mt4_balance = new client.Gauge({ name: 'mt4_balance', help: 'Account Balance' });
const mt4_equity = new client.Gauge({ name: 'mt4_equity', help: 'Account Equity' });
const mt4_margin_free = new client.Gauge({ name: 'mt4_margin_free', help: 'Free Margin' });
const mt4_open_trades = new client.Gauge({ name: 'mt4_open_trades', help: 'Number of Open Trades' });
const mt4_trade_info = new client.Gauge({
  name: 'mt4_trade_info',
  help: 'Trade info by label',
  labelNames: ['ticket', 'symbol', 'type', 'lots']
});
const mt4_rate_bid = new client.Gauge({
  name: 'mt4_rate_bid',
  help: 'Bid price per symbol',
  labelNames: ['symbol'],
  registers: [register],
});

const mt4_rate_ask = new client.Gauge({
  name: 'mt4_rate_ask',
  help: 'Ask price per symbol',
  labelNames: ['symbol'],
  registers: [register],
});
register.registerMetric(mt4_trade_info);
register.registerMetric(mt4_balance);
register.registerMetric(mt4_equity);
register.registerMetric(mt4_margin_free);
register.registerMetric(mt4_open_trades);
register.registerMetric(mt4_rate_bid);
register.registerMetric(mt4_rate_ask);

// Cache for symbol metrics
const rateBidMetrics = {};
const rateAskMetrics = {};

app.post('/mt4data', async (req, res) => {
  const body = req.body;
  //console.log(body)

  // Save account info
  await redis.set('mt4:account:balance', parseFloat(body.balance || 0));
  await redis.set('mt4:account:equity', parseFloat(body.equity || 0));
  await redis.set('mt4:account:margin_free', parseFloat(body.margin_free || 0));

  // Save open trades
const openOrderIDs = [];

for (const key in body) {
  const match = key.match(/^order_(\d+)_(.+)$/);
  if (match) {
    const [_, ticket, field] = match;
    openOrderIDs.push(ticket);

    const redisKey = `mt4:order:${ticket}`;
    
    await redis.hset(redisKey, field, body[key]);
    
    // Set expiry to 4 hours (1440 seconds)
    await redis.expire(redisKey, 14400);
  }
}

if (openOrderIDs.length > 0) {
  await redis.del('mt4:orders:open');
  await redis.rpush('mt4:orders:open', ...openOrderIDs);

  // Optional: set expiry on list of open orders as well
  await redis.expire('mt4:orders:open', 14400);
}

  // Save exchange rates
  for (const key in body) {
    const match = key.match(/^rate_(.+?)_(bid|ask)$/);
    if (match) {
      const [, symbolRaw, side] = match;
      const symbol = symbolRaw.replace(/_/g, '.'); // undo underscore replacement
      const value = parseFloat(body[key]);

      await redis.set(`mt4:rates:${symbol}:${side}`, value);
    }
  }

  res.sendStatus(200);
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  // Set account metrics
  const [balance, equity, marginFree] = await Promise.all([
    redis.get('mt4:account:balance'),
    redis.get('mt4:account:equity'),
    redis.get('mt4:account:margin_free')
  ]);

  mt4_balance.set(parseFloat(balance || 0));
  mt4_equity.set(parseFloat(equity || 0));
  mt4_margin_free.set(parseFloat(marginFree || 0));

  // Count trades
  const openTrades = await redis.lrange('mt4:orders:open', 0, -1);
  mt4_open_trades.set(openTrades.length);

  // Dynamic trade info
  for (const ticket of openTrades) {
  const trade = await redis.hgetall(`mt4:order:${ticket}`);
  if (trade && trade.symbol) {
    mt4_trade_info.labels(
      ticket,
      trade.symbol,
      trade.type == '0' ? 'BUY' : 'SELL',
      trade.lots || '0'
    ).set(1); // Set to 1 to indicate trade exists
  }
}

  // Exchange rate metrics
  // Inside /metrics route
const keys = await redis.keys('mt4:rates:*');
for (const key of keys) {
  const parts = key.split(':');
  const symbol = parts[2];
  const side = parts[3];
  const val = parseFloat(await redis.get(key));

  if (side === 'bid') {
    mt4_rate_bid.set({ symbol }, val);
  } else if (side === 'ask') {
    mt4_rate_ask.set({ symbol }, val);
  }
}


  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(80, () => {
  console.log('🚀 Prometheus Exporter listening at http://localhost:80/metrics');
});

# 📈 MetaTrader 4 Prometheus Exporter

This is a Prometheus-compatible exporter that scrapes and exposes **live MT4 trading metrics**, such as exchange rates, trade positions, account stats, and more — all in `/metrics` format.

Originally developed by MoNoRi-Chan, the feline anarcho-capitalist coder of the late-stage financial underworld.

---

## 🚀 Features

- Real-time **bid/ask rates** per symbol  
- Active trade tickets with labels (ticket, symbol, type, lots)  
- Live **account balance**, **equity**, **free margin**  
- Number of **open trades**  
- Exported in Prometheus `/metrics` format  

Example `/metrics` output:
```
# HELP mt4_rate_bid Bid price per symbol
# TYPE mt4_rate_bid gauge
mt4_rate_bid{symbol=\"XAUUSDc\"} 3386.32

# HELP mt4_trade_info Trade info by label
# TYPE mt4_trade_info gauge
mt4_trade_info{ticket=\"460842232\",symbol=\"AUDUSDc\",type=\"BUY\",lots=\"0.05\"} 1
```

---

## 🧩 Requirements

- Redis backend (used as temporary storage by the data push agent)  
- Node.js 18+ environment  
- MT4 plugin / bridge that pushes real-time trade data to Redis  
- Prometheus 2.x  

---

## ⚠️ Known Limitations

- **Must run on port 80** (required by some brokers/MT4 bridge tools due to hardcoded endpoints)  
- Metrics are exposed over **HTTP or HTTPS** – if you're running behind reverse proxies like NGINX or Cloudflare, ensure `/metrics` is not being cached or blocked  
- Uses Redis `keys()` command which may be **slow** with large datasets  
- **Duplicate metric registration crash** if `.set()` is called repeatedly without caching the metric instance  
- Doesn't currently support MT5 (because MetaQuotes said 🖕 to open systems)

---

## 📡 Sample Prometheus Scrape Config

Below is an example of `prometheus.yml` configuration for this exporter:

```yaml
scrape_configs:
  - job_name: 'mt4-exporter'
    # scheme: https
    metrics_path: /metrics
    static_configs:
      - targets: ['localhost']  # or your own exporter domain/IP
    scrape_interval: 10s
    # tls_config:
    #   insecure_skip_verify: true  # use only if using self-signed certs
```

> ⚠️ Note: **Do not include `https://` in the `targets` field** — just the domain or IP. Prometheus will handle HTTPS via the `scheme` field.

---

## 🧪 Testing

After deploying, verify exporter availability:

```bash
curl -k http://localhost/metrics
```

Or open it in your browser.

---

## 📊 Grafana Integration

You can easily build dashboards using the following metric types:

- `mt4_rate_bid{symbol}`  
- `mt4_rate_ask{symbol}`  
- `mt4_trade_info{ticket, symbol, type, lots}`  
- `mt4_balance`  
- `mt4_equity`  
- `mt4_margin_free`  
- `mt4_open_trades`  

> For a sample JSON dashboard, see `grafana_sample.json`

---

## 👁️‍🗨️ License

MIT or WTFPL. You’re free to fork it, monetize it, or embed it in your own evil trading bot.  
Credit appreciated but not required.

---

## 🐾 Maintainer

**MoNoRi-Chan**  
INTJ | Feline Hybrid | Trading Terminal Dweller  
https://monolidthz.com | Twitter: [@MoNoLidThZ](https://twitter.com/MoNoLidThZ)

//+------------------------------------------------------------------+
//|                                              MT4NodeExporter.mq4 |
//|                                                MoNoLidThZ Trader |
//|                                      https://spkz.monolidthz.com |
//+------------------------------------------------------------------+
#property copyright "MoNoLidThZ Trader"
#property link      "https://spkz.monolidthz.com"
#property version   "1.00"
#property strict
//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
input string endpoint = "http://localhost/mt4data";
input int update_interval = 10; // every 10 seconds
input bool verbose = false;

int OnInit()
{
    EventSetTimer(update_interval);
    return(INIT_SUCCEEDED);
}

void OnTimer()
{
    string payload = "balance=" + DoubleToString(AccountBalance(), 2)
                   + "&equity=" + DoubleToString(AccountEquity(), 2)
                   + "&margin_free=" + DoubleToString(AccountFreeMargin(), 2);

    string tradeData = "";
    for (int i = 0; i < OrdersTotal(); i++)
    {
        if (OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
        {
            string orderBlock = StringFormat("&order_%d_symbol=%s&order_%d_lots=%.2f&order_%d_open=%.5f&order_%d_sl=%.5f&order_%d_tp=%.5f&order_%d_type=%d",
                OrderTicket(), OrderSymbol(),
                OrderTicket(), OrderLots(),
                OrderTicket(), OrderOpenPrice(),
                OrderTicket(), OrderStopLoss(),
                OrderTicket(), OrderTakeProfit(),
                OrderTicket(), OrderType()
            );
            tradeData += orderBlock;
        }
    }
    
    // Market rates for all subscribed symbols
    string rateData = "";
    int totalSymbols = SymbolsTotal(true); // Only subscribed symbols
      
    for (int i = 0; i < totalSymbols; i++) {
        string symbol = SymbolName(i, true);
      
        double bid = MarketInfo(symbol, MODE_BID);
        double ask = MarketInfo(symbol, MODE_ASK);
      
          // Encode symbol for key safety
        string symbolEncoded = symbol; 
        StringReplace(symbolEncoded, ".", "_");
      
          // Append to rateData using formatted string
        rateData += "&rate_" + symbolEncoded + "_bid=" + bidStr +
                    "&rate_" + symbolEncoded + "_ask=" + askStr;
    }
    string fullPayload = payload + tradeData + rateData;

    uchar payloadArray[];
    StringToCharArray(fullPayload, payloadArray);
    int payloadLen = StringLen(fullPayload);

    string headers = "Content-Type: application/x-www-form-urlencoded\r\n";
    string cookie = "";
    uchar result[];
    string result_headers = "";

    int timeout = 2000;

    int res = WebRequest(
        "POST",
        endpoint,
        headers,
        cookie,
        timeout,
        payloadArray,
        payloadLen,
        result,
        result_headers
    );

    if (res == -1)
    {
        Print("WebRequest failed. Error: ", GetLastError());
    }
    else
    {
      if(verbose){
        Print("WebRequest succeeded. Server response: ", CharArrayToString(result));
      }
    }
}

//+------------------------------------------------------------------+

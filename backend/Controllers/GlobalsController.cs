using System;
using System.Globalization;
using System.Linq;
using System.Text.Json;
using MarginCoinAPI.Configuration;
using MarginCoinAPI.Model;
using MarginCoinAPI.Service;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace MarginCoinAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GlobalsController : ControllerBase
    {
        private readonly ITradingState _tradingState;
        private readonly ISymbolService _symbolService;
        private readonly IBinanceService _binanceService;
        private readonly TradingConfiguration _tradingConfig;
        private readonly ITradingSettingsService _settingsService;
        private readonly ApplicationDbContext _appDbContext;

        public GlobalsController(
            ITradingState tradingState,
            ISymbolService symbolService,
            IBinanceService binanceService,
            IOptions<TradingConfiguration> tradingConfig,
            ITradingSettingsService settingsService,
            ApplicationDbContext appDbContext)
        {
            _tradingState = tradingState;
            _symbolService = symbolService;
            _binanceService = binanceService;
            _tradingConfig = tradingConfig.Value;
            _settingsService = settingsService;
            _appDbContext = appDbContext;
        }

        [HttpGet("[action]")]
        public bool GetServer() => _tradingState.IsProd;

        [HttpGet("[action]")]
        public bool GetOrderType() => _tradingState.IsMarketOrder;

        [HttpGet("[action]/{isMarketOrder}")]
        public void SetOrderType(bool isMarketOrder)
        {
            _tradingState.IsMarketOrder = isMarketOrder;
        }

        [HttpGet("[action]/{isProd}")]
        public IActionResult SetServer(bool isProd)
        {
            _tradingState.IsProd = isProd;
            _tradingState.SymbolBaseList = _symbolService.GetTopSymbols(_tradingConfig.NumberOfSymbols);

            if (isProd)
            {
                var account = _binanceService.Account();
                if (account == null)
                {
                    _tradingState.IsProd = false;
                    return BadRequest("Unable to connect to Binance Production. Check that your IP address is whitelisted in your Binance API key settings.");
                }
            }

            return Ok();
        }

        [HttpGet("[action]/{isOpen}")]
        public void SetTradeParameter(bool isOpen)
        {
            _tradingState.IsTradingOpen = isOpen;
        }

        [HttpGet("[action]")]
        public bool GetTradingStatus() => _tradingState.IsTradingOpen;

        [HttpGet("[action]")]
        public string GetInterval() => JsonSerializer.Serialize(_tradingConfig.Interval);

        [HttpGet("[action]")]
        public IActionResult CheckBalance()
        {
            var account = _binanceService.Account();
            if (account?.balances == null)
                return BadRequest("Unable to retrieve account balance from Binance.");

            var usdcBalance = account.balances.FirstOrDefault(b => b.asset == "USDC");
            double availableBalance = 0;
            if (usdcBalance != null)
                double.TryParse(usdcBalance.free, NumberStyles.Any, CultureInfo.InvariantCulture, out availableBalance);

            var runtime = _settingsService.GetRuntimeSettingsAsync().GetAwaiter().GetResult();
            var activeOrders = _appDbContext.Order.Count(p => p.IsClosed == 0);
            var remainingSlots = Math.Max(0, runtime.MaxOpenTrades - activeOrders);
            var requiredBalance = remainingSlots * runtime.QuoteOrderQty;

            return Ok(new
            {
                availableBalance,
                requiredBalance,
                activeOrders,
                maxOpenTrades = runtime.MaxOpenTrades,
                remainingSlots,
                quoteOrderQty = runtime.QuoteOrderQty,
                sufficient = availableBalance >= requiredBalance
            });
        }

        [HttpGet("[action]")]
        public object GetMemoryDiagnostics()
        {
            var candleMatrixSymbolCount = _tradingState.CandleMatrix.Count;
            var candleMatrixTotalCandles = _tradingState.CandleMatrix.Sum(list => list.Count);
            var candleMatrixAvgCandlesPerSymbol = candleMatrixSymbolCount > 0
                ? candleMatrixTotalCandles / candleMatrixSymbolCount
                : 0;

            var processMemory = GC.GetTotalMemory(false) / 1024.0 / 1024.0; // MB
            var gen0Collections = GC.CollectionCount(0);
            var gen1Collections = GC.CollectionCount(1);
            var gen2Collections = GC.CollectionCount(2);

            return new
            {
                timestamp = DateTime.UtcNow,
                collections = new
                {
                    candleMatrix = new
                    {
                        symbolCount = candleMatrixSymbolCount,
                        totalCandles = candleMatrixTotalCandles,
                        avgCandlesPerSymbol = candleMatrixAvgCandlesPerSymbol
                    },
                    allMarketData = new
                    {
                        count = _tradingState.AllMarketData.Count
                    },
                    marketStreamOnSpot = new
                    {
                        count = _tradingState.MarketStreamOnSpot.Count
                    },
                    onHold = new
                    {
                        count = _tradingState.OnHold.Count,
                        symbols = _tradingState.OnHold.Keys.ToList()
                    },
                    symbolBaseList = new
                    {
                        count = _tradingState.SymbolBaseList.Count
                    }
                },
                memory = new
                {
                    managedMemoryMB = Math.Round(processMemory, 2),
                    gcCollections = new
                    {
                        gen0 = gen0Collections,
                        gen1 = gen1Collections,
                        gen2 = gen2Collections
                    }
                }
            };
        }
    }
}

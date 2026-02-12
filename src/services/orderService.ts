export interface Order {
  id: number;
  buyOrderId: number;
  sellOrderId: number;
  orderDate: string;
  symbol: string;
  side: string;
  status: string;
  isClosed: number;
  quantityBuy: number;
  quantitySell: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  closePrice: number;
  volume: number;
  stopLose: number;
  takeProfit: number;
  profit: number;
  fee: number;
  type: string;
  trendScore: number;
  aiScore: number;
  aiPrediction: string;
  exitAIScore: number;
  exitAIPrediction: string;
  openAISignal: string;
  openAIScore: number;
  openAIConfidence: number;
  openAIRiskLevel: string;
  openAIReasoning: string;
  openDate: string;
  closeDate: string;
  rsi: number;
  macdHist: number;
  macd: number;
  macdSign: number;
  ema: number;
  stochSlowD: number;
  stochSlowK: number;
  atr: number;
}

export const orderService = {
  async getAllOrders(): Promise<Order[]> {
    const response = await fetch('/api/Order/GetAllCompletedOrder');
    if (!response.ok) {
      throw new Error('Failed to fetch orders');
    }
    return response.json();
  },

  async getOpenOrder(symbol: string): Promise<Order[]> {
    const response = await fetch(`/api/Order/GetOpenOrder/${symbol}`);
    if (!response.ok) {
      throw new Error('Failed to fetch open orders');
    }
    return response.json();
  },

  async getPendingOrders(): Promise<Order[]> {
    const response = await fetch('/api/Order/GetPendingdOrder');
    if (!response.ok) {
      throw new Error('Failed to fetch pending orders');
    }
    return response.json();
  },

  async startTrading(): Promise<string> {
    const response = await fetch('/api/AlgoTrade/MonitorMarket');
    if (!response.ok) {
      throw new Error('Failed to start trading');
    }
    return response.text();
  },

  async setTradingState(isOpen: boolean): Promise<void> {
    const response = await fetch(`/api/Globals/SetTradeParameter/${isOpen}`);
    if (!response.ok) {
      throw new Error('Failed to set trading state');
    }
  },

  async getTradingStatus(): Promise<boolean> {
    const response = await fetch('/api/Globals/GetTradingStatus');
    if (!response.ok) {
      throw new Error('Failed to get trading status');
    }
    return response.json();
  },

  async testBinanceBuy(): Promise<void> {
    const response = await fetch('/api/AlgoTrade/TestBinanceBuy');
    if (!response.ok) {
      throw new Error('Failed to execute test buy');
    }
  },

  async syncBinanceSymbol(): Promise<void> {
    const response = await fetch('/api/AlgoTrade/SyncBinanceSymbol');
    if (!response.ok) {
      throw new Error('Failed to sync Binance symbols');
    }
  },

  async closeOrder(orderId: number, lastPrice: number): Promise<void> {
    const response = await fetch(`/api/AlgoTrade/CloseTrade/${orderId}/${lastPrice}`);
    if (!response.ok) {
      throw new Error('Failed to close order');
    }
  },

  async getServer(): Promise<boolean> {
    const response = await fetch('/api/Globals/GetServer');
    if (!response.ok) {
      throw new Error('Failed to get server mode');
    }
    return response.json();
  },

  async setServer(isProd: boolean): Promise<void> {
    const response = await fetch(`/api/Globals/SetServer/${isProd}`);
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Failed to set server mode');
    }
  },

  async checkBalance(): Promise<BalanceCheck> {
    const response = await fetch('/api/Globals/CheckBalance');
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Failed to check balance');
    }
    return response.json();
  }
};

export interface BalanceCheck {
  availableBalance: number;
  requiredBalance: number;
  activeOrders: number;
  maxOpenTrades: number;
  remainingSlots: number;
  quoteOrderQty: number;
  sufficient: boolean;
}

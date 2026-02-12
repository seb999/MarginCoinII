import { TrendingUp, Activity, Wifi, WifiOff, Calendar, BarChart2, Zap, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Alert, Checkbox, Chip, TextField, Box, IconButton, Switch, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';
import { orderService, type Order, type BalanceCheck } from '../services/orderService';
import { signalRService, type WebSocketStatus, type CandleUpdate, type Candle } from '../services/signalRService';
import ChartModal from '../components/ChartModal';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#f0b90b',
    },
    background: {
      default: '#0b0e11',
      paper: '#181a20',
    },
    text: {
      primary: '#eaecef',
      secondary: '#848e9c',
    },
  },
});

export default function Trade() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTrading, setIsTrading] = useState(false);
  const [isTradingEnabled, setIsTradingEnabled] = useState(false);
  const [isProd, setIsProd] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [wsStatus, setWsStatus] = useState<WebSocketStatus | null>(null);
  const [latestCandle, setLatestCandle] = useState<CandleUpdate | null>(null);

  // Date filtering
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [fromDate, setFromDate] = useState<string>(getTodayDate());
  const [toDate, setToDate] = useState<string>(getTodayDate());

  // Chart modal state
  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [chartSymbol, setChartSymbol] = useState('');
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartEntryPrice, setChartEntryPrice] = useState<number | undefined>();
  const [chartExitPrice, setChartExitPrice] = useState<number | undefined>();
  const [chartEntryTime, setChartEntryTime] = useState<string | undefined>();
  const [chartExitTime, setChartExitTime] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [balanceWarningOpen, setBalanceWarningOpen] = useState(false);
  const [balanceInfo, setBalanceInfo] = useState<BalanceCheck | null>(null);
  const [activeOnly, setActiveOnly] = useState(false);

  useEffect(() => {
    loadOrders();
    loadTradingStatus();
    loadServerMode();
    setupSignalR();

    return () => {
      signalRService.stop();
    };
  }, []);

  const loadTradingStatus = async () => {
    try {
      const status = await orderService.getTradingStatus();
      setIsTradingEnabled(status);
    } catch (error) {
      console.error('Failed to load trading status:', error);
    }
  };

  const loadServerMode = async () => {
    try {
      const prod = await orderService.getServer();
      setIsProd(prod);
    } catch (error) {
      console.error('Failed to load server mode:', error);
    }
  };

  const toggleServerMode = async () => {
    try {
      const newMode = !isProd;
      await orderService.setServer(newMode);
      setIsProd(newMode);
    } catch (error) {
      console.error('Failed to toggle server mode:', error);
      setError(error instanceof Error ? error.message : 'Failed to toggle server mode');
    }
  };

  const setupSignalR = async () => {
    console.log('Setting up SignalR connection...');
    await signalRService.start();
    console.log('SignalR connection started');
    setConnectionStatus('connected');

    signalRService.on('websocketStatus', (data: WebSocketStatus) => {
      console.log('Received websocketStatus:', data);
      setWsStatus(data);
      setIsTrading(data.status === 'connected');
    });

    signalRService.on('candleUpdate', (data: CandleUpdate) => {
      console.log('Received candleUpdate:', data);
      setLatestCandle(data);
    });

    signalRService.on('refreshUI', () => {
      console.log('🔄 Received refreshUI signal - reloading all orders...');
      loadOrders().then(() => {
        console.log('✅ Orders reloaded successfully');
      }).catch(err => {
        console.error('❌ Failed to reload orders:', err);
      });
    });

    signalRService.on('insufficientBalance', (data: { symbol: string; required: number; available: number }) => {
      setError(`Insufficient balance for ${data.symbol}: need ${data.required} USDC, available ${data.available.toFixed(2)} USDC`);
    });

    signalRService.on('trading', (candleList: Candle[]) => {
      console.log('Received trading data:', candleList);
      console.log('Candle symbols:', candleList?.map(c => c.s).join(', '));

      // Update orders in real-time based on candle data
      if (candleList && candleList.length > 0) {
        setOrders(prevOrders => {
          let hasUpdates = false;
          const updatedOrders = prevOrders.map(order => {
            // Find matching candle by symbol
            const matchingCandle = candleList.find(candle => candle.s === order.symbol);

            if (matchingCandle && !order.isClosed) {
              // Update closePrice and profit
              const updatedClosePrice = matchingCandle.c;
              const updatedProfit = (updatedClosePrice - (order.openPrice || 0)) * (order.quantityBuy || 0);

              // Only update if values actually changed
              if (order.closePrice !== updatedClosePrice || order.profit !== updatedProfit) {
                hasUpdates = true;
                console.log(`Updating ${order.symbol}: closePrice=${updatedClosePrice}, profit=${updatedProfit.toFixed(2)}`);

                return {
                  ...order,
                  closePrice: updatedClosePrice,
                  profit: updatedProfit
                };
              }
            }

            return order;
          });

          if (hasUpdates) {
            console.log('📊 Data updated, forcing re-render');
          }

          return hasUpdates ? updatedOrders : prevOrders;
        });
      }
    });

    signalRService.on('replacement', (data: any) => {
      console.log('Received replacement data:', data);
    });
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await orderService.getAllOrders();

      // Calculate profit for open orders if closePrice exists but profit is 0
      const ordersWithProfit = data.map(order => {
        if (!order.isClosed && order.closePrice > 0 && order.profit === 0) {
          const calculatedProfit = (order.closePrice - (order.openPrice || 0)) * (order.quantityBuy || 0);
          return { ...order, profit: calculatedProfit };
        }
        return order;
      });

      setOrders(ordersWithProfit);
      filterOrders(ordersWithProfit, fromDate, toDate, activeOnly);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = (orderList: Order[], from: string, to: string, onlyActive: boolean) => {
    const fromDateTime = new Date(from).setHours(0, 0, 0, 0);
    const toDateTime = new Date(to).setHours(23, 59, 59, 999);

    const filtered = orderList.filter(order => {
      if (onlyActive && order.isClosed) return false;
      if (!order.orderDate) return false;

      // Parse the order date (format: "07/02/2026 11:30:51")
      const [datePart] = order.orderDate.split(' ');
      const [day, month, year] = datePart.split('/');
      const orderDateTime = new Date(`${year}-${month}-${day}`).getTime();

      return orderDateTime >= fromDateTime && orderDateTime <= toDateTime;
    });

    console.log(`Filtered ${filtered.length} orders from ${orderList.length} total`);
    setFilteredOrders(filtered);
  };

  useEffect(() => {
    console.log('Orders changed, refiltering...');
    filterOrders(orders, fromDate, toDate, activeOnly);
  }, [fromDate, toDate, orders, activeOnly]);

  const toggleTrading = async () => {
    const newState = !isTradingEnabled;

    // Show confirmation if starting trading on PROD
    if (newState && isProd) {
      setConfirmOpen(true);
      return;
    }

    await executeToggleTrading(newState);
  };

  const executeToggleTrading = async (newState: boolean) => {
    try {
      if (newState) {
        // Check balance before starting trading
        try {
          const balance = await orderService.checkBalance();
          if (!balance.sufficient) {
            setBalanceInfo(balance);
            setBalanceWarningOpen(true);
            return;
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to check balance');
          return;
        }

        console.log('Initializing market...');
        await orderService.startTrading();
        console.log('Market initialized, enabling trading...');
      }

      await orderService.setTradingState(newState);
      setIsTradingEnabled(newState);
      console.log('Trading state changed to:', newState);
    } catch (error) {
      console.error('Failed to toggle trading state:', error);
    }
  };

  const handleConfirmStartTrading = async () => {
    setConfirmOpen(false);
    await executeToggleTrading(true);
  };

  const handleTestBuy = async () => {
    try {
      console.log('Executing test buy...');
      await orderService.testBinanceBuy();
      console.log('Test buy signal sent - order will be created on next market tick');
      setError(null);
      // Reload orders multiple times to catch the async order creation
      setTimeout(() => loadOrders(), 2000);
      setTimeout(() => loadOrders(), 4000);
      setTimeout(() => loadOrders(), 6000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to execute test buy';
      console.error('Test buy failed:', errorMsg);
      setError(errorMsg);
    }
  };

  const handleSyncSymbols = async () => {
    try {
      console.log('Syncing Binance symbols...');
      await orderService.syncBinanceSymbol();
      console.log('Symbols synced successfully');
      setError(null);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to sync symbols';
      console.error('Sync symbols failed:', errorMsg);
      setError(errorMsg);
    }
  };

  const handleOpenChart = async (order: Order) => {
    try {
      setError(null);

      console.log('Fetching chart data for:', order.symbol);
      const response = await fetch(`/api/AlgoTrade/GetCandleData/${order.symbol}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch chart data for ${order.symbol}`);
      }

      const data = await response.json();
      console.log('Received candle data:', data.length, 'candles');

      setChartSymbol(order.symbol);
      setChartData(data);
      setChartEntryPrice(order.openPrice || undefined);
      setChartExitPrice(order.closePrice || undefined);
      setChartEntryTime(order.openDate || undefined);
      setChartExitTime(order.closeDate || undefined);
      setChartModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chart data');
      console.error('Failed to load chart:', err);
    }
  };

  const handleCloseOrder = async (order: Order) => {
    try {
      console.log('Closing order:', order.id, order.symbol);
      await orderService.closeOrder(order.id, order.openPrice || 0);
      console.log('Order closed successfully');
      setError(null);
      // Reload orders to see the closed order
      setTimeout(() => loadOrders(), 1000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to close order';
      console.error('Close order failed:', errorMsg);
      setError(errorMsg);
    }
  };

  const columns: GridColDef[] = [
    { field: 'symbol', headerName: 'Symbol', width: 130 },
    { field: 'side', headerName: 'Side', width: 90 },
    { field: 'status', headerName: 'Status', width: 110 },
    {
      field: 'orderDate',
      headerName: 'Time',
      width: 100,
      valueGetter: (value: string) => {
        if (!value) return '';
        // Extract time from "dd/MM/yyyy HH:mm:ss" format
        const timePart = value.split(' ')[1];
        return timePart || value;
      }
    },
    {
      field: 'openPrice',
      headerName: 'Entry Price',
      width: 110,
      type: 'number',
      valueFormatter: (value: number) => value?.toFixed(4)
    },
    {
      field: 'quantity',
      headerName: 'Amount (USDC)',
      width: 160,
      renderCell: (params) => {
        const buyAmount = (params.row.quantityBuy || 0) * (params.row.openPrice || 0);
        const sellAmount = (params.row.quantitySell || 0) * (params.row.closePrice || 0);
        return `${Math.round(buyAmount)} / ${Math.round(sellAmount)}`;
      }
    },
    {
      field: 'bestProfit',
      headerName: 'Best Profit',
      width: 120,
      type: 'number',
      renderCell: (params) => {
        const highPrice = params.row.highPrice || 0;
        const openPrice = params.row.openPrice || 0;
        const quantity = params.row.quantityBuy || 0;
        const bestProfit = (highPrice - openPrice) * quantity;
        return (
          <span style={{ color: bestProfit > 0 ? '#0ecb81' : bestProfit < 0 ? '#f6465d' : '#eaecef' }}>
            {bestProfit.toFixed(2)}
          </span>
        );
      }
    },
    {
      field: 'profit',
      headerName: 'Profit',
      width: 120,
      type: 'number',
      valueFormatter: (value: number) => value?.toFixed(2),
      cellClassName: (params) =>
        params.value > 0 ? 'profit-positive' : params.value < 0 ? 'profit-negative' : ''
    },
    {
      field: 'profitPercent',
      headerName: 'Profit %',
      width: 100,
      type: 'number',
      renderCell: (params) => {
        const openPrice = params.row.openPrice || 0;
        const closePrice = params.row.closePrice || 0;
        if (openPrice === 0) return '0.00%';

        const profitPercent = ((closePrice - openPrice) / openPrice) * 100;
        return (
          <span style={{
            color: profitPercent > 0 ? '#0ecb81' : profitPercent < 0 ? '#f6465d' : '#eaecef',
            fontWeight: 'bold'
          }}>
            {profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%
          </span>
        );
      }
    },
    { field: 'type', headerName: 'Type', width: 100 },
    {
      field: 'trendScore',
      headerName: 'TS',
      width: 80,
      type: 'number',
      valueFormatter: (value: number) => value?.toFixed(1),
      cellClassName: (params) =>
        params.value > 0 ? 'profit-positive' : params.value < 0 ? 'profit-negative' : ''
    },
    {
      field: 'rsi',
      headerName: 'RSI',
      width: 80,
      type: 'number',
      valueFormatter: (value: number) => value?.toFixed(2)
    },
    {
      field: 'aiScore',
      headerName: 'AI Score',
      width: 100,
      type: 'number',
      valueFormatter: (value: number) => value?.toFixed(2)
    },
    { field: 'aiPrediction', headerName: 'AI Prediction', width: 130 },
    {
      field: 'chart',
      headerName: 'Chart',
      width: 80,
      sortable: false,
      renderCell: (params) => (
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            handleOpenChart(params.row);
          }}
          sx={{
            color: '#f0b90b',
            '&:hover': {
              backgroundColor: 'rgba(240, 185, 11, 0.1)',
            },
          }}
        >
          <BarChart2 size={18} />
        </IconButton>
      ),
    },
    {
      field: 'sell',
      headerName: 'Sell',
      width: 80,
      sortable: false,
      renderCell: (params) => {
        // Only show sell button for open orders (not closed)
        const isOpen = params.row.isClosed === 0 || params.row.isClosed === false;

        if (!isOpen) {
          return null;
        }

        return (
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              handleCloseOrder(params.row);
            }}
            sx={{
              color: '#f6465d',
              '&:hover': {
                backgroundColor: 'rgba(246, 70, 93, 0.1)',
              },
            }}
          >
            <X size={18} />
          </IconButton>
        );
      },
    },
  ];

  return (
    <ThemeProvider theme={darkTheme}>
      <div className="page-container">
        <div className="page-header">
          <TrendingUp size={32} />
          <h1>Trade</h1>
        </div>
        <div className="page-content">
          {/* Status Bar */}
          <div style={{ marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              className={isTradingEnabled ? "danger-button" : "primary-button"}
              onClick={toggleTrading}
              style={{
                backgroundColor: isTradingEnabled ? '#f6465d' : undefined,
                borderColor: isTradingEnabled ? '#f6465d' : undefined,
                minWidth: '120px',
                padding: '6px 12px',
                fontSize: '14px'
              }}
            >
              <Activity size={16} style={{ marginRight: '6px' }} />
              {isTradingEnabled ? 'Stop Trading' : 'Start Trading'}
            </button>

            <button
              className="primary-button"
              onClick={handleTestBuy}
              style={{
                backgroundColor: '#0ecb81',
                borderColor: '#0ecb81',
                minWidth: '100px',
                padding: '6px 12px',
                fontSize: '14px'
              }}
            >
              <Zap size={16} style={{ marginRight: '6px' }} />
              Test Buy
            </button>

            <button
              className="primary-button"
              onClick={handleSyncSymbols}
              style={{
                backgroundColor: '#f0b90b',
                borderColor: '#f0b90b',
                minWidth: '120px',
                padding: '6px 12px',
                fontSize: '14px'
              }}
            >
              <RefreshCw size={16} style={{ marginRight: '6px' }} />
              Sync Symbols
            </button>

            <Chip
              icon={connectionStatus === 'connected' ? <Wifi size={16} /> : <WifiOff size={16} />}
              label={connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
              color={connectionStatus === 'connected' ? 'success' : 'default'}
              variant="outlined"
            />

            {isTrading && (
              <Chip
                icon={<Activity size={16} />}
                label="WebSocket Active"
                color="success"
                sx={{
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.7 }
                  }
                }}
              />
            )}

            {isTradingEnabled && (
              <Chip
                icon={<Activity size={16} />}
                label="Trading Enabled"
                color="warning"
                sx={{
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.7 }
                  }
                }}
              />
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={isProd}
                  onChange={toggleServerMode}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#f6465d',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#f6465d',
                    },
                    '& .MuiSwitch-switchBase': {
                      color: '#0ecb81',
                    },
                    '& .MuiSwitch-track': {
                      backgroundColor: '#0ecb81',
                    },
                  }}
                />
              }
              label={isProd ? 'PROD' : 'TEST'}
              sx={{
                marginLeft: 'auto',
                '& .MuiFormControlLabel-label': {
                  color: isProd ? '#f6465d' : '#0ecb81',
                  fontWeight: 'bold',
                  fontSize: '14px',
                },
              }}
            />
          </div>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ marginBottom: '20px' }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Date Filter */}
          <Box sx={{ marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Calendar size={20} style={{ color: '#f0b90b' }} />
            <TextField
              label="From Date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#eaecef',
                  '& fieldset': { borderColor: '#2b3139' },
                  '&:hover fieldset': { borderColor: '#f0b90b' },
                  '&.Mui-focused fieldset': { borderColor: '#f0b90b' }
                },
                '& .MuiInputLabel-root': { color: '#848e9c' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#f0b90b' }
              }}
            />
            <TextField
              label="To Date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#eaecef',
                  '& fieldset': { borderColor: '#2b3139' },
                  '&:hover fieldset': { borderColor: '#f0b90b' },
                  '&.Mui-focused fieldset': { borderColor: '#f0b90b' }
                },
                '& .MuiInputLabel-root': { color: '#848e9c' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#f0b90b' }
              }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={activeOnly}
                  onChange={(e) => setActiveOnly(e.target.checked)}
                  sx={{
                    color: '#848e9c',
                    '&.Mui-checked': { color: '#f0b90b' },
                  }}
                  size="small"
                />
              }
              label="Active only"
              sx={{ '& .MuiFormControlLabel-label': { color: '#848e9c', fontSize: '0.9em' } }}
            />
            <Chip
              label={`${filteredOrders.length} of ${orders.length} orders`}
              color="primary"
              variant="outlined"
            />
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 16px',
              backgroundColor: '#181a20',
              borderRadius: '8px',
              border: '1px solid #2b3139'
            }}>
              <span style={{ color: '#848e9c', fontSize: '0.9em' }}>Total Profit:</span>
              <span style={{
                fontSize: '1.2em',
                fontWeight: 'bold',
                color: filteredOrders.reduce((sum, order) => sum + (order.profit || 0), 0) >= 0 ? '#0ecb81' : '#f6465d'
              }}>
                ${filteredOrders.reduce((sum, order) => sum + (order.profit || 0), 0).toFixed(2)}
              </span>
            </Box>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 16px',
              backgroundColor: '#181a20',
              borderRadius: '8px',
              border: '1px solid #2b3139'
            }}>
              <span style={{ color: '#848e9c', fontSize: '0.9em' }}>Net Profit:</span>
              <span style={{
                fontSize: '1.2em',
                fontWeight: 'bold',
                color: filteredOrders.reduce((sum, order) => sum + (order.profit || 0) - (order.fee || 0), 0) >= 0 ? '#0ecb81' : '#f6465d'
              }}>
                ${filteredOrders.reduce((sum, order) => sum + (order.profit || 0) - (order.fee || 0), 0).toFixed(2)}
              </span>
              <span style={{ color: '#848e9c', fontSize: '0.75em' }}>
                (fees: ${filteredOrders.reduce((sum, order) => sum + (order.fee || 0), 0).toFixed(2)})
              </span>
            </Box>
          </Box>

          {/* WebSocket Status */}
          {wsStatus && (
            <Alert
              severity="info"
              icon={<Wifi size={20} />}
              sx={{ marginBottom: '20px' }}
            >
              <strong>{wsStatus.message}</strong>
              <div style={{ marginTop: '5px', fontSize: '0.9em' }}>
                Symbol: {wsStatus.symbol} | Interval: {wsStatus.interval} | Status: {wsStatus.status}
              </div>
            </Alert>
          )}

          {/* Latest Candle Update */}
          {latestCandle && (
            <Alert
              severity={latestCandle.change > 0 ? 'success' : 'warning'}
              sx={{ marginBottom: '20px' }}
            >
              <strong>{latestCandle.symbol}</strong>: ${latestCandle.price}
              <span style={{ marginLeft: '10px', color: latestCandle.change > 0 ? '#0ecb81' : '#f6465d' }}>
                ({latestCandle.change > 0 ? '+' : ''}{latestCandle.change.toFixed(2)}%)
              </span>
            </Alert>
          )}

          <div style={{ height: 'calc(100vh - 280px)', width: '100%' }}>
            <DataGrid
              rows={filteredOrders}
              columns={columns}
              loading={loading}
              pageSizeOptions={[10, 25, 50, 100]}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 25, page: 0 },
                },
              }}
              getRowClassName={(params) => {
                const isClosed = params.row.isClosed === 1 || params.row.isClosed === true;
                return isClosed ? 'trade-closed' : 'trade-open';
              }}
              sx={{
                border: '1px solid #2b3139',
                '& .MuiDataGrid-cell': {
                  borderBottom: '1px solid #2b3139',
                },
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: '#1e2329',
                  borderBottom: '1px solid #2b3139',
                },
                '& .profit-positive': {
                  color: '#0ecb81',
                  fontWeight: 'bold',
                },
                '& .profit-negative': {
                  color: '#f6465d',
                  fontWeight: 'bold',
                },
                '& .trade-open': {
                  borderLeft: '4px solid #ff9800',
                },
                '& .trade-closed': {
                  borderLeft: '4px solid #0ecb81',
                },
              }}
            />
          </div>
        </div>

        {/* Chart Modal */}
        <ChartModal
          open={chartModalOpen}
          onClose={() => setChartModalOpen(false)}
          symbol={chartSymbol}
          candleData={chartData}
          entryPrice={chartEntryPrice}
          exitPrice={chartExitPrice}
          entryTime={chartEntryTime}
          exitTime={chartExitTime}
        />

        {/* Prod Trading Confirmation Dialog */}
        <Dialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          PaperProps={{
            sx: {
              backgroundColor: '#181a20',
              border: '1px solid #f6465d',
            }
          }}
        >
          <DialogTitle sx={{ color: '#f6465d', fontWeight: 'bold' }}>
            Start Trading on PRODUCTION?
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ color: '#eaecef' }}>
              You are about to start trading on the <strong style={{ color: '#f6465d' }}>PRODUCTION</strong> server with real funds. Are you sure?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)} sx={{ color: '#848e9c' }}>
              Cancel
            </Button>
            <Button onClick={handleConfirmStartTrading} sx={{ color: '#f6465d', fontWeight: 'bold' }}>
              Start Trading
            </Button>
          </DialogActions>
        </Dialog>

        {/* Insufficient Balance Warning Dialog */}
        <Dialog
          open={balanceWarningOpen}
          onClose={() => setBalanceWarningOpen(false)}
          PaperProps={{
            sx: {
              backgroundColor: '#181a20',
              border: '1px solid #f0b90b',
            }
          }}
        >
          <DialogTitle sx={{ color: '#f0b90b', fontWeight: 'bold' }}>
            Insufficient USDC Balance
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ color: '#eaecef' }}>
              {balanceInfo && (
                <>
                  Your available USDC balance is insufficient to cover all potential trades.
                  <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                    <span>Available: <strong style={{ color: '#f6465d' }}>{balanceInfo.availableBalance.toFixed(2)} USDC</strong></span>
                    <span>Required: <strong style={{ color: '#0ecb81' }}>{balanceInfo.requiredBalance.toFixed(2)} USDC</strong> ({balanceInfo.remainingSlots} slots x {balanceInfo.quoteOrderQty} USDC)</span>
                    <span>Active trades: {balanceInfo.activeOrders} / {balanceInfo.maxOpenTrades}</span>
                  </Box>
                </>
              )}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBalanceWarningOpen(false)} sx={{ color: '#848e9c' }}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </ThemeProvider>
  );
}

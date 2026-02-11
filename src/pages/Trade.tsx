import { TrendingUp, Activity, Wifi, WifiOff, Calendar, BarChart2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Alert, Chip, TextField, Box, IconButton } from '@mui/material';
import { orderService, type Order } from '../services/orderService';
import { signalRService, type WebSocketStatus, type CandleUpdate } from '../services/signalRService';
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
    loadTradingStatus();
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
      console.log('Received refreshUI signal');
      loadOrders();
    });

    signalRService.on('trading', (data: any) => {
      console.log('Received trading data:', data);
    });

    signalRService.on('replacement', (data: any) => {
      console.log('Received replacement data:', data);
    });
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await orderService.getAllOrders();
      setOrders(data);
      filterOrders(data, fromDate, toDate);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = (orderList: Order[], from: string, to: string) => {
    const fromDateTime = new Date(from).setHours(0, 0, 0, 0);
    const toDateTime = new Date(to).setHours(23, 59, 59, 999);

    const filtered = orderList.filter(order => {
      if (!order.orderDate) return false;

      // Parse the order date (format: "07/02/2026 11:30:51")
      const [datePart] = order.orderDate.split(' ');
      const [day, month, year] = datePart.split('/');
      const orderDateTime = new Date(`${year}-${month}-${day}`).getTime();

      return orderDateTime >= fromDateTime && orderDateTime <= toDateTime;
    });

    setFilteredOrders(filtered);
  };

  useEffect(() => {
    filterOrders(orders, fromDate, toDate);
  }, [fromDate, toDate, orders]);

  const toggleTrading = async () => {
    try {
      const newState = !isTradingEnabled;

      if (newState) {
        // Starting trading - initialize market first
        console.log('Initializing market...');
        await orderService.startTrading();
        console.log('Market initialized, enabling trading...');
      }

      // Toggle trading state
      await orderService.setTradingState(newState);
      setIsTradingEnabled(newState);
      console.log('Trading state changed to:', newState);
    } catch (error) {
      console.error('Failed to toggle trading state:', error);
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
      setChartModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chart data');
      console.error('Failed to load chart:', err);
    }
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'symbol', headerName: 'Symbol', width: 130 },
    { field: 'side', headerName: 'Side', width: 90 },
    { field: 'status', headerName: 'Status', width: 110 },
    {
      field: 'openPrice',
      headerName: 'Open Price',
      width: 130,
      type: 'number',
      valueFormatter: (value: number) => value?.toFixed(8)
    },
    {
      field: 'closePrice',
      headerName: 'Close Price',
      width: 130,
      type: 'number',
      valueFormatter: (value: number) => value?.toFixed(8)
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
    { field: 'type', headerName: 'Type', width: 100 },
    { field: 'orderDate', headerName: 'Order Date', width: 180 },
    {
      field: 'quantityBuy',
      headerName: 'Quantity',
      width: 130,
      type: 'number',
      valueFormatter: (value: number) => value?.toFixed(6)
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
                minWidth: '150px'
              }}
            >
              <Activity size={18} style={{ marginRight: '8px' }} />
              {isTradingEnabled ? 'Stop Trading' : 'Start Trading'}
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
            <Chip
              label={`${filteredOrders.length} of ${orders.length} orders`}
              color="primary"
              variant="outlined"
            />
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

          <div style={{ height: 600, width: '100%' }}>
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
        />
      </div>
    </ThemeProvider>
  );
}

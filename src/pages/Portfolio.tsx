import { Wallet, ArrowRightLeft, RefreshCw, BarChart2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Alert, TextField, Button, Select, MenuItem, FormControl, InputLabel, Box, IconButton, Switch, FormControlLabel } from '@mui/material';
import ChartModal from '../components/ChartModal';
import { orderService } from '../services/orderService';

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

interface Asset {
  asset: string;
  free: string;
  locked: string;
  total: number;
  usdValue: number;
  trendScore?: number;
}

export default function Portfolio() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  // Swap form state
  const [fromAsset, setFromAsset] = useState('');
  const [toAsset, setToAsset] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [swapping, setSwapping] = useState(false);

  // Chart modal state
  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [chartSymbol, setChartSymbol] = useState('');
  const [chartData, setChartData] = useState<any[]>([]);
  const [isProd, setIsProd] = useState(false);

  useEffect(() => {
    loadAssets();
    loadServerMode();
  }, []);

  const loadServerMode = async () => {
    try {
      const prod = await orderService.getServer();
      setIsProd(prod);
    } catch (err) {
      console.error('Failed to load server mode:', err);
    }
  };

  const toggleServerMode = async () => {
    try {
      const newMode = !isProd;
      await orderService.setServer(newMode);
      setIsProd(newMode);
      await loadAssets();
    } catch (err) {
      console.error('Failed to toggle server mode:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle server mode');
    }
  };

  const loadAssets = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch account balance
      const accountResponse = await fetch('/api/Binance/BinanceAccount');
      if (!accountResponse.ok) {
        throw new Error('Failed to fetch account balance');
      }
      const accountData = await accountResponse.json();

      // Fetch current prices
      const pricesResponse = await fetch('/api/AlgoTrade/GetSymbolPrice');
      if (!pricesResponse.ok) {
        throw new Error('Failed to fetch symbol prices');
      }
      const pricesData = await pricesResponse.json();

      // Create price lookup map
      const priceMap = new Map<string, number>();
      pricesData.forEach((price: any) => {
        priceMap.set(price.symbol, parseFloat(price.price));
      });

      // Fetch trend scores
      let trendScoresMap = new Map<string, number>();
      try {
        const trendScoresResponse = await fetch('/api/AlgoTrade/GetTrendScores');
        if (trendScoresResponse.ok) {
          const trendScoresData = await trendScoresResponse.json();
          trendScoresData.forEach((score: any) => {
            trendScoresMap.set(score.symbol, score.trendScore);
          });
        }
      } catch (err) {
        console.warn('Failed to fetch trend scores:', err);
      }

      // Convert Binance account response to Asset format with USD values
      const formattedAssets = accountData.balances.map((balance: any) => {
        const total = parseFloat(balance.free) + parseFloat(balance.locked);
        let usdValue = 0;

        if (balance.asset === 'USDC' || balance.asset === 'USDT') {
          // Stablecoins are 1:1 with USD
          usdValue = total;
        } else {
          // Try to find price in USDC first, then USDT
          const usdcSymbol = `${balance.asset}USDC`;
          const usdtSymbol = `${balance.asset}USDT`;

          const price = priceMap.get(usdcSymbol) || priceMap.get(usdtSymbol) || 0;
          usdValue = total * price;
        }

        // Get trend score for this asset
        const usdcSymbol = `${balance.asset}USDC`;
        const usdtSymbol = `${balance.asset}USDT`;
        const trendScore = trendScoresMap.get(usdcSymbol) || trendScoresMap.get(usdtSymbol);

        return {
          asset: balance.asset,
          free: balance.free,
          locked: balance.locked,
          total: total,
          usdValue: usdValue,
          trendScore: trendScore,
        };
      });

      setAssets(formattedAssets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assets');
      console.error('Failed to load assets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = async () => {
    if (!fromAsset || !toAsset || !amount) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setSwapping(true);
      setError(null);

      const quoteCurrencies = ['USDC', 'USDT'];
      const qty = parseFloat(amount);

      if (quoteCurrencies.includes(fromAsset)) {
        // Buying: USDC -> BTC means buy on BTCUSDC pair with quoteOrderQty
        const symbol = `${toAsset}${fromAsset}`;
        const response = await fetch(`/api/Binance/Buy/${symbol}/${qty}`);
        if (!response.ok) {
          throw new Error(`Failed to buy ${toAsset} with ${fromAsset}`);
        }
      } else {
        // Selling: BTC -> USDC means sell on BTCUSDC pair with quantity
        const symbol = `${fromAsset}${toAsset}`;
        const response = await fetch(`/api/Binance/Sell/${symbol}/${qty}`);
        if (!response.ok) {
          throw new Error(`Failed to sell ${fromAsset} for ${toAsset}`);
        }
      }

      console.log('Swap completed successfully');

      // Reload assets after successful swap
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for order to settle
      await loadAssets();

      // Reset form
      setAmount('');
      setFromAsset('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to swap assets');
      console.error('Failed to swap assets:', err);
    } finally {
      setSwapping(false);
    }
  };

  const handleOpenChart = async (asset: string) => {
    try {
      // Skip stablecoins as they don't have meaningful charts
      if (asset === 'USDC' || asset === 'USDT') {
        setError('Charts not available for stablecoins');
        return;
      }

      const symbol = `${asset}USDC`;
      console.log('Fetching chart data for:', symbol);
      const response = await fetch(`/api/AlgoTrade/GetCandleData/${symbol}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch chart data for ${symbol}`);
      }

      const data = await response.json();
      console.log('Received candle data:', data.length, 'candles');
      console.log('First candle:', data[0]);
      console.log('Last candle:', data[data.length - 1]);

      setChartSymbol(symbol);
      setChartData(data);
      setChartModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chart data');
      console.error('Failed to load chart:', err);
    }
  };

  const columns: GridColDef[] = [
    { field: 'asset', headerName: 'Asset', width: 120 },
    {
      field: 'free',
      headerName: 'Available',
      width: 130,
      type: 'number',
      valueFormatter: (value: string) => parseFloat(value).toFixed(8),
    },
    {
      field: 'locked',
      headerName: 'Locked',
      width: 130,
      type: 'number',
      valueFormatter: (value: string) => parseFloat(value).toFixed(8),
    },
    {
      field: 'total',
      headerName: 'Total',
      width: 130,
      type: 'number',
      valueFormatter: (value: number) => value.toFixed(8),
    },
    {
      field: 'usdValue',
      headerName: 'USD Value',
      width: 130,
      type: 'number',
      valueFormatter: (value: number) => `$${value.toFixed(2)}`,
      cellClassName: () => 'usd-value-cell',
    },
    {
      field: 'trendScore',
      headerName: 'TS',
      width: 90,
      type: 'number',
      valueFormatter: (value: number | undefined) => value !== undefined ? value.toFixed(1) : 'N/A',
      cellClassName: (params) => {
        if (params.value === undefined || params.value === null) return '';
        return params.value > 0 ? 'ts-positive' : params.value < 0 ? 'ts-negative' : '';
      },
    },
    {
      field: 'chart',
      headerName: 'Chart',
      width: 80,
      sortable: false,
      renderCell: (params) => (
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            handleOpenChart(params.row.asset);
          }}
          disabled={params.row.asset === 'USDC' || params.row.asset === 'USDT'}
          sx={{
            color: '#f0b90b',
            '&:hover': {
              backgroundColor: 'rgba(240, 185, 11, 0.1)',
            },
            '&:disabled': {
              color: '#2b3139',
            },
          }}
        >
          <BarChart2 size={18} />
        </IconButton>
      ),
    },
  ];

  // Filter out assets with zero balance for display
  const filteredAssets = assets.filter(a => a.total > 0);
  const totalUsdValue = filteredAssets.reduce((sum, asset) => sum + asset.usdValue, 0);

  return (
    <ThemeProvider theme={darkTheme}>
      <div className="page-container">
        <div className="page-header">
          <Wallet size={32} />
          <h1>Portfolio</h1>
        </div>
        <div className="page-content">
          {error && (
            <Alert severity="error" sx={{ marginBottom: '20px' }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <Button
              variant="outlined"
              startIcon={<RefreshCw size={18} />}
              onClick={loadAssets}
              disabled={loading}
              sx={{
                borderColor: '#f0b90b',
                color: '#f0b90b',
                '&:hover': {
                  borderColor: '#f0b90b',
                  backgroundColor: 'rgba(240, 185, 11, 0.1)',
                },
              }}
            >
              Refresh
            </Button>
            <Box sx={{ color: '#eaecef', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>Total Value:</span>
              <span style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#f0b90b' }}>
                ${totalUsdValue.toFixed(2)}
              </span>
            </Box>

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

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
            {/* Left side - Assets DataGrid */}
            <div style={{ height: 600 }}>
              <DataGrid
                rows={filteredAssets}
                columns={columns}
                loading={loading}
                getRowId={(row) => row.asset}
                pageSizeOptions={[10, 25, 50, 100]}
                onRowClick={(params) => {
                  setFromAsset(params.row.asset);
                  setSelectedAsset(params.row.asset);
                }}
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: 25, page: 0 },
                  },
                  sorting: {
                    sortModel: [{ field: 'usdValue', sort: 'desc' }],
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
                  '& .MuiDataGrid-row': {
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'rgba(240, 185, 11, 0.1)',
                    },
                  },
                  '& .MuiDataGrid-row.Mui-selected': {
                    backgroundColor: 'rgba(240, 185, 11, 0.2)',
                    '&:hover': {
                      backgroundColor: 'rgba(240, 185, 11, 0.25)',
                    },
                  },
                  '& .usd-value-cell': {
                    color: '#f0b90b',
                    fontWeight: 'bold',
                  },
                  '& .ts-positive': {
                    color: '#0ecb81',
                    fontWeight: 'bold',
                  },
                  '& .ts-negative': {
                    color: '#f6465d',
                    fontWeight: 'bold',
                  },
                }}
              />
            </div>

            {/* Right side - Swap Panel */}
            <div
              style={{
                backgroundColor: '#181a20',
                border: '1px solid #2b3139',
                borderRadius: '8px',
                padding: '20px',
                height: 'fit-content',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <ArrowRightLeft size={24} color="#f0b90b" />
                <h2 style={{ margin: 0, color: '#eaecef' }}>Swap Assets</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <FormControl fullWidth>
                  <InputLabel id="from-asset-label" sx={{ color: '#848e9c' }}>
                    From Asset
                  </InputLabel>
                  <Select
                    labelId="from-asset-label"
                    value={fromAsset}
                    label="From Asset"
                    onChange={(e) => setFromAsset(e.target.value)}
                    sx={{
                      color: '#eaecef',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: selectedAsset === fromAsset ? '#f0b90b' : '#2b3139' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#f0b90b' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#f0b90b' },
                    }}
                  >
                    {filteredAssets.map((asset) => (
                      <MenuItem key={asset.asset} value={asset.asset}>
                        {asset.asset} ({parseFloat(asset.free).toFixed(8)})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <TextField
                    label="Amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    fullWidth
                    slotProps={{
                      inputLabel: { sx: { color: '#848e9c' } },
                    }}
                    sx={{
                      flex: 1,
                      '& .MuiOutlinedInput-root': {
                        color: '#eaecef',
                        '& fieldset': { borderColor: '#2b3139' },
                        '&:hover fieldset': { borderColor: '#f0b90b' },
                        '&.Mui-focused fieldset': { borderColor: '#f0b90b' },
                      },
                    }}
                  />
                  <Button
                    variant="outlined"
                    onClick={() => {
                      const asset = filteredAssets.find((a) => a.asset === fromAsset);
                      if (asset) {
                        setAmount(asset.free);
                      }
                    }}
                    disabled={!fromAsset}
                    sx={{
                      borderColor: '#f0b90b',
                      color: '#f0b90b',
                      '&:hover': {
                        borderColor: '#f0b90b',
                        backgroundColor: 'rgba(240, 185, 11, 0.1)',
                      },
                      '&:disabled': {
                        borderColor: '#2b3139',
                        color: '#848e9c',
                      },
                    }}
                  >
                    Max
                  </Button>
                </div>

                <FormControl fullWidth>
                  <InputLabel id="to-asset-label" sx={{ color: '#848e9c' }}>
                    To Asset
                  </InputLabel>
                  <Select
                    labelId="to-asset-label"
                    value={toAsset}
                    label="To Asset"
                    onChange={(e) => setToAsset(e.target.value)}
                    sx={{
                      color: '#eaecef',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#2b3139' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#f0b90b' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#f0b90b' },
                    }}
                  >
                    <MenuItem value="USDC">USDC</MenuItem>
                    <MenuItem value="USDT">USDT</MenuItem>
                    <MenuItem value="BTC">BTC</MenuItem>
                    <MenuItem value="ETH">ETH</MenuItem>
                  </Select>
                </FormControl>

                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleSwap}
                  disabled={swapping || !fromAsset || !toAsset || !amount}
                  startIcon={<ArrowRightLeft size={18} />}
                  sx={{
                    backgroundColor: '#f0b90b',
                    color: '#0b0e11',
                    fontWeight: 'bold',
                    padding: '12px',
                    '&:hover': {
                      backgroundColor: '#d9a00a',
                    },
                    '&:disabled': {
                      backgroundColor: '#2b3139',
                      color: '#848e9c',
                    },
                  }}
                >
                  {swapping ? 'Swapping...' : 'Swap'}
                </Button>

                {fromAsset && (
                  <div style={{ color: '#848e9c', fontSize: '0.9em', marginTop: '10px' }}>
                    Available: {filteredAssets.find((a) => a.asset === fromAsset)?.free || '0'} {fromAsset}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Chart Modal */}
        <ChartModal
          open={chartModalOpen}
          onClose={() => setChartModalOpen(false)}
          symbol={chartSymbol}
          candleData={chartData}
        />
      </div>
    </ThemeProvider>
  );
}

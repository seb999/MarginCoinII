import { Wallet, ArrowRightLeft, RefreshCw, BarChart2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Alert, TextField, Button, Select, MenuItem, FormControl, InputLabel, Box, IconButton } from '@mui/material';
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

interface Asset {
  asset: string;
  free: string;
  locked: string;
  total: number;
  usdValue: number;
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

  useEffect(() => {
    loadAssets();
  }, []);

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

        return {
          asset: balance.asset,
          free: balance.free,
          locked: balance.locked,
          total: total,
          usdValue: usdValue,
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

      // Step 1: Sell the fromAsset to get toAsset (e.g., BTC -> USDC means sell BTCUSDC)
      const symbol = `${fromAsset}${toAsset}`;
      const qty = parseFloat(amount);

      const sellResponse = await fetch(`/api/Binance/Sell/${symbol}/${qty}`);
      if (!sellResponse.ok) {
        throw new Error(`Failed to sell ${fromAsset} for ${toAsset}`);
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

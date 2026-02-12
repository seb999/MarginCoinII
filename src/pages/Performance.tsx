import { BarChart2, TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react';
import { useEffect, useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Alert, CircularProgress, Box, Paper } from '@mui/material';

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

interface Trade {
  symbol: string;
  profit: number;
  closeDate: string;
  closePrice: number;
  maxPotentialProfit: number;
}

interface PerformanceData {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalGains: number;
  totalLosses: number;
  netProfit: number;
  bestTrade: number;
  worstTrade: number;
  totalFees: number;
  trades: Trade[];
}

export default function Performance() {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPerformance();
  }, []);

  const loadPerformance = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/Performance');
      if (!response.ok) {
        throw new Error('Failed to fetch performance data');
      }
      const data = await response.json();
      setPerformanceData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const getChartOptions = (): Highcharts.Options => {
    if (!performanceData) return {};

    // Calculate average profit/loss
    const averageProfit = performanceData.totalTrades > 0
      ? performanceData.netProfit / performanceData.totalTrades
      : 0;

    // Calculate cumulative profit/loss (accumulation)
    let cumulativeProfit = 0;
    const cumulativeData = performanceData.trades.map((trade) => {
      cumulativeProfit += trade.profit;
      return cumulativeProfit;
    });

    return {
      chart: {
        type: 'column',
        backgroundColor: '#181a20',
        style: {
          fontFamily: 'inherit',
        },
      },
      title: {
        text: 'Trade Performance',
        style: {
          color: '#eaecef',
        },
      },
      xAxis: {
        categories: performanceData.trades.map(t => t.symbol),
        labels: {
          style: {
            color: '#848e9c',
          },
          rotation: -45,
        },
        lineColor: '#2b3139',
      },
      yAxis: [
        {
          title: {
            text: 'Profit/Loss (USDC)',
            style: {
              color: '#eaecef',
            },
          },
          labels: {
            style: {
              color: '#848e9c',
            },
          },
          gridLineColor: '#2b3139',
          plotLines: [
            {
              value: 0,
              color: '#848e9c',
              width: 1,
              zIndex: 2,
            },
            {
              value: averageProfit,
              color: '#f0b90b',
              width: 2,
              dashStyle: 'Dash',
              zIndex: 3,
              label: {
                text: `Avg: $${averageProfit.toFixed(2)}`,
                align: 'right',
                style: {
                  color: '#f0b90b',
                  fontWeight: 'bold',
                },
              },
            },
          ],
        },
        {
          title: {
            text: 'Cumulative P/L (USDC)',
            style: {
              color: '#3861fb',
            },
          },
          labels: {
            style: {
              color: '#3861fb',
            },
          },
          opposite: true,
          gridLineColor: 'transparent',
        },
      ],
      legend: {
        enabled: true,
        itemStyle: {
          color: '#eaecef',
        },
      },
      tooltip: {
        backgroundColor: '#0b0e11',
        borderColor: '#f0b90b',
        style: {
          color: '#eaecef',
        },
        formatter: function(this: any) {
          const pointIndex = this.point?.index || 0;
          const trade = performanceData.trades[pointIndex];
          const yValue = this.y || 0;
          return `<b>${trade.symbol}</b><br/>` +
            `Profit/Loss: <span style="color: ${yValue >= 0 ? '#0ecb81' : '#f6465d'}">$${yValue.toFixed(2)}</span><br/>` +
            `Best Profit: <span style="color: #f0b90b">$${trade.maxPotentialProfit.toFixed(2)}</span><br/>` +
            `Close Date: ${trade.closeDate || 'N/A'}`;
        },
      },
      plotOptions: {
        column: {
          borderWidth: 0,
          grouping: false, // Disable grouping to overlap bars
          dataLabels: {
            enabled: false,
          },
        },
      },
      series: [
        {
          name: 'Actual Profit/Loss',
          type: 'column',
          yAxis: 0,
          data: performanceData.trades.map((trade) => ({
            y: trade.profit,
            color: trade.profit >= 0 ? '#0ecb81' : '#f6465d',
          })),
        },
        {
          name: 'Best Profit Reached',
          type: 'column',
          yAxis: 0,
          data: performanceData.trades.map((trade) => ({
            y: trade.maxPotentialProfit,
            color: 'rgba(240, 185, 11, 0.4)', // Yellow transparent
          })),
        },
        {
          name: 'Cumulative P/L',
          type: 'line',
          yAxis: 1,
          data: cumulativeData,
          color: '#3861fb',
          lineWidth: 3,
          marker: {
            enabled: true,
            radius: 4,
            fillColor: '#3861fb',
          },
          zIndex: 10,
        },
      ],
      credits: {
        enabled: false,
      },
    };
  };

  const StatCard = ({ icon, title, value, color, subtitle }: {
    icon: React.ReactNode;
    title: string;
    value: string | number;
    color: string;
    subtitle?: string;
  }) => (
    <Paper sx={{ p: 2, backgroundColor: '#181a20', border: '1px solid #2b3139' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Box sx={{ color }}>{icon}</Box>
        <span style={{ color: '#848e9c', fontSize: '0.9em' }}>{title}</span>
      </Box>
      <Box sx={{ fontSize: '1.5em', fontWeight: 'bold', color, mb: 0.5 }}>
        {value}
      </Box>
      {subtitle && (
        <Box sx={{ fontSize: '0.8em', color: '#848e9c' }}>
          {subtitle}
        </Box>
      )}
    </Paper>
  );

  if (loading) {
    return (
      <ThemeProvider theme={darkTheme}>
        <div className="page-container">
          <div className="page-header">
            <BarChart2 size={32} />
            <h1>Performance</h1>
          </div>
          <div className="page-content" style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
            <CircularProgress />
          </div>
        </div>
      </ThemeProvider>
    );
  }

  if (error || !performanceData) {
    return (
      <ThemeProvider theme={darkTheme}>
        <div className="page-container">
          <div className="page-header">
            <BarChart2 size={32} />
            <h1>Performance</h1>
          </div>
          <div className="page-content">
            <Alert severity="error">{error || 'No performance data available'}</Alert>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  // Calculate win rate: % of trades that were winners
  const winRate = performanceData.totalTrades > 0
    ? ((performanceData.winningTrades / performanceData.totalTrades) * 100).toFixed(1)
    : '0.0';

  // Calculate profit factor: Total Gains / Total Losses
  const profitFactor = performanceData.totalLosses !== 0
    ? (performanceData.totalGains / Math.abs(performanceData.totalLosses))
    : 0;

  return (
    <ThemeProvider theme={darkTheme}>
      <div className="page-container">
        <div className="page-header">
          <BarChart2 size={32} />
          <h1>Performance</h1>
        </div>
        <div className="page-content">
          {/* Statistics Cards */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2, mb: 3 }}>
            <StatCard
              icon={<DollarSign size={24} />}
              title="Net Profit"
              value={`$${(performanceData.netProfit - performanceData.totalFees).toFixed(2)}`}
              color={(performanceData.netProfit - performanceData.totalFees) >= 0 ? '#0ecb81' : '#f6465d'}
              subtitle={`Raw: $${performanceData.netProfit.toFixed(2)} | Fees: $${performanceData.totalFees.toFixed(2)} | ${performanceData.totalTrades} trades`}
            />
            <StatCard
              icon={<TrendingUp size={24} />}
              title="Win Rate"
              value={`${winRate}%`}
              color="#f0b90b"
              subtitle={`${performanceData.winningTrades} wins / ${performanceData.losingTrades} losses | Profit Factor: ${(profitFactor * 100).toFixed(1)}%`}
            />
            <StatCard
              icon={<Target size={24} />}
              title="Best Trade"
              value={`$${performanceData.bestTrade.toFixed(2)}`}
              color="#0ecb81"
            />
            <StatCard
              icon={<TrendingDown size={24} />}
              title="Worst Trade"
              value={`$${performanceData.worstTrade.toFixed(2)}`}
              color="#f6465d"
            />
          </Box>

          {/* Additional Stats Row */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2, mb: 3 }}>
            <StatCard
              icon={<TrendingUp size={24} />}
              title="Total Gains"
              value={`$${performanceData.totalGains.toFixed(2)}`}
              color="#0ecb81"
            />
            <StatCard
              icon={<TrendingDown size={24} />}
              title="Total Losses"
              value={`$${performanceData.totalLosses.toFixed(2)}`}
              color="#f6465d"
            />
            <StatCard
              icon={<DollarSign size={24} />}
              title="Total Fees"
              value={`$${performanceData.totalFees.toFixed(2)}`}
              color="#f0b90b"
              subtitle={`Avg: $${performanceData.totalTrades > 0 ? (performanceData.totalFees / performanceData.totalTrades).toFixed(2) : '0.00'} per trade`}
            />
          </Box>

          {/* Chart */}
          {performanceData.trades.length > 0 ? (
            <Paper sx={{ p: 2, backgroundColor: '#181a20', border: '1px solid #2b3139' }}>
              <HighchartsReact
                highcharts={Highcharts}
                options={getChartOptions()}
              />
            </Paper>
          ) : (
            <Alert severity="info">No completed trades to display</Alert>
          )}
        </div>
      </div>
    </ThemeProvider>
  );
}

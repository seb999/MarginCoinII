import { useRef } from 'react';
import Highcharts from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';
// Import indicators - this modifies Highcharts directly
import 'highcharts/indicators/indicators-all';

interface CandleData {
  x: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface TradingChartProps {
  symbol: string;
  candleData: CandleData[];
  entryPrice?: number;
  exitPrice?: number;
  height?: number | string;
}

export default function TradingChart({
  symbol,
  candleData,
  entryPrice,
  exitPrice,
  height = 500
}: TradingChartProps) {
  const chartRef = useRef<HighchartsReact.RefObject>(null);

  // Debug: Log the data
  console.log('TradingChart received data:', candleData.length, 'candles');
  console.log('First 3 candles:', candleData.slice(0, 3));

  // Handle empty data
  if (!candleData || candleData.length === 0) {
    return <div style={{ color: '#848e9c', padding: '20px', textAlign: 'center' }}>No chart data available</div>;
  }

  // Prepare data for Highcharts - ensure all values are numbers
  const ohlc: [number, number, number, number, number][] = candleData.map(candle => [
    Number(candle.x),
    Number(candle.open),
    Number(candle.high),
    Number(candle.low),
    Number(candle.close)
  ]);

  const volume: [number, number][] = candleData.map(candle => [
    Number(candle.x),
    Number(candle.volume || 0)
  ]);

  console.log('OHLC data sample:', ohlc.slice(0, 3));
  console.log('Volume data sample:', volume.slice(0, 3));
  console.log('Data stats:', {
    minPrice: Math.min(...ohlc.map(c => c[4])),
    maxPrice: Math.max(...ohlc.map(c => c[4])),
    minTime: Math.min(...ohlc.map(c => c[0])),
    maxTime: Math.max(...ohlc.map(c => c[0]))
  });

  // Create plotLines for entry and exit
  const plotLines: Highcharts.YAxisPlotLinesOptions[] = [];

  if (entryPrice) {
    plotLines.push({
      color: '#0ecb81',
      width: 2,
      value: entryPrice,
      dashStyle: 'Dash',
      label: {
        text: `Entry: ${entryPrice.toFixed(6)}`,
        align: 'right',
        style: {
          color: '#0ecb81',
          fontWeight: 'bold'
        }
      },
      zIndex: 5
    });
  }

  if (exitPrice) {
    plotLines.push({
      color: '#f6465d',
      width: 2,
      value: exitPrice,
      dashStyle: 'Dash',
      label: {
        text: `Exit: ${exitPrice.toFixed(6)}`,
        align: 'right',
        style: {
          color: '#f6465d',
          fontWeight: 'bold'
        }
      },
      zIndex: 5
    });
  }

  const options: Highcharts.Options = {
    chart: {
      backgroundColor: '#181a20',
      height: height,
    },
    rangeSelector: {
      enabled: true,
      selected: 1,
      inputEnabled: false,
      buttonTheme: {
        fill: '#2b3139',
        stroke: '#2b3139',
        style: {
          color: '#eaecef'
        },
        states: {
          hover: {
            fill: '#f0b90b',
            style: {
              color: '#0b0e11'
            }
          },
          select: {
            fill: '#f0b90b',
            style: {
              color: '#0b0e11'
            }
          }
        }
      },
      inputStyle: {
        color: '#eaecef',
        backgroundColor: '#2b3139'
      },
      labelStyle: {
        color: '#848e9c'
      }
    },
    title: {
      text: symbol,
      style: {
        color: '#eaecef',
        fontSize: '18px',
        fontWeight: 'bold'
      }
    },
    credits: {
      enabled: false
    },
    navigator: {
      enabled: true,
      maskFill: 'rgba(240, 185, 11, 0.1)',
      outlineColor: '#2b3139',
      series: {
        color: '#f0b90b',
        lineColor: '#f0b90b'
      },
      xAxis: {
        gridLineColor: '#2b3139',
        labels: {
          style: {
            color: '#848e9c'
          }
        }
      }
    },
    scrollbar: {
      enabled: true,
      barBackgroundColor: '#2b3139',
      barBorderColor: '#2b3139',
      buttonBackgroundColor: '#2b3139',
      buttonBorderColor: '#2b3139',
      rifleColor: '#848e9c',
      trackBackgroundColor: '#0b0e11',
      trackBorderColor: '#2b3139'
    },
    xAxis: {
      type: 'datetime',
      gridLineColor: '#2b3139',
      labels: {
        style: {
          color: '#848e9c'
        }
      },
      lineColor: '#2b3139'
    },
    yAxis: [
      {
        // Price axis
        labels: {
          align: 'right',
          style: {
            color: '#848e9c'
          }
        },
        height: '70%',
        gridLineColor: '#2b3139',
        plotLines: plotLines
      },
      {
        // MACD axis
        labels: {
          align: 'right',
          style: {
            color: '#848e9c'
          }
        },
        top: '72%',
        height: '13%',
        gridLineColor: '#2b3139',
        offset: 0
      },
      {
        // Volume axis
        labels: {
          align: 'right',
          style: {
            color: '#848e9c'
          }
        },
        top: '87%',
        height: '13%',
        gridLineColor: '#2b3139',
        offset: 0
      }
    ],
    tooltip: {
      backgroundColor: '#181a20',
      borderColor: '#2b3139',
      style: {
        color: '#eaecef'
      },
      split: false,
      shared: true
    },
    plotOptions: {
      candlestick: {
        color: '#f6465d',
        upColor: '#0ecb81',
        lineColor: '#f6465d',
        upLineColor: '#0ecb81'
      },
      column: {
        color: '#848e9c'
      }
    },
    series: [
      {
        type: 'candlestick',
        name: symbol,
        data: ohlc,
        id: 'price',
        yAxis: 0,
        tooltip: {
          valueDecimals: 6
        }
      } as any,
      {
        type: 'column',
        name: 'Volume',
        data: volume,
        yAxis: 2,
        tooltip: {
          valueDecimals: 2
        }
      } as any,
      {
        type: 'macd',
        linkedTo: 'price',
        yAxis: 1,
        params: {
          shortPeriod: 12,
          longPeriod: 26,
          signalPeriod: 9,
          period: 26
        }
      } as any
    ]
  };

  return (
    <div style={{ width: '100%' }}>
      <HighchartsReact
        highcharts={Highcharts}
        constructorType={'stockChart'}
        options={options}
        ref={chartRef}
      />
    </div>
  );
}

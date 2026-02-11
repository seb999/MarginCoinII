import { Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import { X } from 'lucide-react';
import TradingChart from './TradingChart';

interface CandleData {
  x: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface ChartModalProps {
  open: boolean;
  onClose: () => void;
  symbol: string;
  candleData: CandleData[];
  entryPrice?: number;
  exitPrice?: number;
}

export default function ChartModal({
  open,
  onClose,
  symbol,
  candleData,
  entryPrice,
  exitPrice
}: ChartModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#181a20',
          backgroundImage: 'none',
          border: '1px solid #2b3139',
          minHeight: '80vh'
        }
      }}
    >
      <DialogTitle
        sx={{
          backgroundColor: '#181a20',
          color: '#eaecef',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #2b3139',
          padding: '16px 24px'
        }}
      >
        <span style={{ fontSize: '20px', fontWeight: 'bold' }}>
          {symbol} Chart
        </span>
        <IconButton
          onClick={onClose}
          sx={{
            color: '#848e9c',
            '&:hover': {
              color: '#f0b90b',
              backgroundColor: 'rgba(240, 185, 11, 0.1)'
            }
          }}
        >
          <X size={24} />
        </IconButton>
      </DialogTitle>
      <DialogContent
        sx={{
          backgroundColor: '#181a20',
          padding: '24px'
        }}
      >
        <TradingChart
          symbol={symbol}
          candleData={candleData}
          entryPrice={entryPrice}
          exitPrice={exitPrice}
          height={600}
        />
      </DialogContent>
    </Dialog>
  );
}

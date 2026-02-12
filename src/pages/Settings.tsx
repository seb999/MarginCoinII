import { Settings as SettingsIcon, Save, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  Paper,
  Typography,
  Box,
  CircularProgress
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';

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

interface RuntimeSettings {
  maxOpenTrades: number;
  quoteOrderQty: number;
  stopLossPercentage: number;
  takeProfitPercentage: number;
  timeBasedKillMinutes: number;
  enableAggressiveReplacement: boolean;
  surgeScoreThreshold: number;
  replacementScoreGap: number;
  replacementCooldownSeconds: number;
  maxReplacementsPerHour: number;
  maxCandidateDepth: number;
  minPositionAgeForReplacementSeconds: number;
  weakTrendStopLossPercentage: number;
  enableDynamicStopLoss: boolean;
  trailingStopPercentage: number;
  trailArmBufferPercentage: number;
  enableMLPredictions: boolean;
  enableOpenAISignals: boolean;
}

export default function Settings() {
  const [settings, setSettings] = useState<RuntimeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/Settings/runtime');
      if (!response.ok) {
        throw new Error('Failed to load settings');
      }
      const data = await response.json();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/Settings/runtime', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      const updated = await response.json();
      setSettings(updated);
      setSuccess('Settings saved successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof RuntimeSettings, value: number | boolean) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  if (loading) {
    return (
      <ThemeProvider theme={darkTheme}>
        <div className="page-container">
          <div className="page-header">
            <SettingsIcon size={32} />
            <h1>Settings</h1>
          </div>
          <div className="page-content" style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
            <CircularProgress />
          </div>
        </div>
      </ThemeProvider>
    );
  }

  if (!settings) {
    return (
      <ThemeProvider theme={darkTheme}>
        <div className="page-container">
          <div className="page-header">
            <SettingsIcon size={32} />
            <h1>Settings</h1>
          </div>
          <div className="page-content">
            <Alert severity="error">{error || 'Failed to load settings'}</Alert>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <div className="page-container">
        <div className="page-header">
          <SettingsIcon size={32} />
          <h1>Settings</h1>
        </div>
        <div className="page-content">
          {/* Action Buttons */}
          <Box sx={{ marginBottom: '20px', display: 'flex', gap: '15px' }}>
            <Button
              variant="contained"
              startIcon={<Save size={18} />}
              onClick={handleSave}
              disabled={saving}
              sx={{
                backgroundColor: '#0ecb81',
                '&:hover': { backgroundColor: '#0bb871' },
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshCw size={18} />}
              onClick={loadSettings}
              disabled={loading || saving}
              sx={{
                borderColor: '#f0b90b',
                color: '#f0b90b',
                '&:hover': { borderColor: '#d4a00a', backgroundColor: 'rgba(240, 185, 11, 0.1)' },
              }}
            >
              Reload
            </Button>
          </Box>

          {/* Alerts */}
          {error && (
            <Alert severity="error" sx={{ marginBottom: '20px' }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ marginBottom: '20px' }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          {/* Trading Settings */}
          <Paper sx={{ padding: '20px', marginBottom: '20px', backgroundColor: '#181a20' }}>
            <Typography variant="h6" sx={{ marginBottom: '15px', color: '#f0b90b' }}>
              Trading Settings
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              <TextField
                label="Max Open Trades"
                type="number"
                value={settings.maxOpenTrades}
                onChange={(e) => handleChange('maxOpenTrades', parseInt(e.target.value))}
                helperText="Maximum number of concurrent open positions"
                fullWidth
              />
              <TextField
                label="Order Quantity (USDC)"
                type="number"
                value={settings.quoteOrderQty}
                onChange={(e) => handleChange('quoteOrderQty', parseFloat(e.target.value))}
                helperText="Amount in USDC per order"
                fullWidth
              />
              <TextField
                label="Stop Loss %"
                type="number"
                slotProps={{ htmlInput: { step: 0.1 } }}
                value={settings.stopLossPercentage}
                onChange={(e) => handleChange('stopLossPercentage', parseFloat(e.target.value))}
                helperText="Stop loss percentage from entry"
                fullWidth
              />
              <TextField
                label="Take Profit %"
                type="number"
                slotProps={{ htmlInput: { step: 0.1 } }}
                value={settings.takeProfitPercentage}
                onChange={(e) => handleChange('takeProfitPercentage', parseFloat(e.target.value))}
                helperText="Take profit percentage from entry"
                fullWidth
              />
              <TextField
                label="Time-Based Kill (minutes)"
                type="number"
                value={settings.timeBasedKillMinutes}
                onChange={(e) => handleChange('timeBasedKillMinutes', parseInt(e.target.value))}
                helperText="Close stalled positions after X minutes"
                fullWidth
              />
            </Box>
          </Paper>

          {/* Aggressive Replacement Settings */}
          <Paper sx={{ padding: '20px', marginBottom: '20px', backgroundColor: '#181a20' }}>
            <Typography variant="h6" sx={{ marginBottom: '15px', color: '#f0b90b' }}>
              Aggressive Replacement
            </Typography>
            <Box sx={{ marginBottom: '20px' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableAggressiveReplacement}
                    onChange={(e) => handleChange('enableAggressiveReplacement', e.target.checked)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#0ecb81',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#0ecb81',
                      },
                    }}
                  />
                }
                label="Enable Aggressive Replacement"
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              <TextField
                label="Surge Score Threshold"
                type="number"
                slotProps={{ htmlInput: { step: 0.1 } }}
                value={settings.surgeScoreThreshold}
                onChange={(e) => handleChange('surgeScoreThreshold', parseFloat(e.target.value))}
                helperText="Minimum surge score to consider replacement"
                fullWidth
                disabled={!settings.enableAggressiveReplacement}
              />
              <TextField
                label="Replacement Score Gap"
                type="number"
                slotProps={{ htmlInput: { step: 0.05 } }}
                value={settings.replacementScoreGap}
                onChange={(e) => handleChange('replacementScoreGap', parseFloat(e.target.value))}
                helperText="Gap required between new and old scores"
                fullWidth
                disabled={!settings.enableAggressiveReplacement}
              />
              <TextField
                label="Cooldown (seconds)"
                type="number"
                value={settings.replacementCooldownSeconds}
                onChange={(e) => handleChange('replacementCooldownSeconds', parseInt(e.target.value))}
                helperText="Cooldown period between replacements"
                fullWidth
                disabled={!settings.enableAggressiveReplacement}
              />
              <TextField
                label="Max Replacements/Hour"
                type="number"
                value={settings.maxReplacementsPerHour}
                onChange={(e) => handleChange('maxReplacementsPerHour', parseInt(e.target.value))}
                helperText="Maximum replacements per hour"
                fullWidth
                disabled={!settings.enableAggressiveReplacement}
              />
              <TextField
                label="Max Candidate Depth"
                type="number"
                value={settings.maxCandidateDepth}
                onChange={(e) => handleChange('maxCandidateDepth', parseInt(e.target.value))}
                helperText="How deep to look for candidates"
                fullWidth
              />
              <TextField
                label="Min Position Age (seconds)"
                type="number"
                value={settings.minPositionAgeForReplacementSeconds}
                onChange={(e) => handleChange('minPositionAgeForReplacementSeconds', parseInt(e.target.value))}
                helperText="Minimum time before a position can be replaced"
                fullWidth
                disabled={!settings.enableAggressiveReplacement}
              />
            </Box>
          </Paper>

          {/* Risk Management */}
          <Paper sx={{ padding: '20px', marginBottom: '20px', backgroundColor: '#181a20' }}>
            <Typography variant="h6" sx={{ marginBottom: '15px', color: '#f0b90b' }}>
              Risk Management
            </Typography>
            <Box sx={{ marginBottom: '20px' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableDynamicStopLoss}
                    onChange={(e) => handleChange('enableDynamicStopLoss', e.target.checked)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#0ecb81',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#0ecb81',
                      },
                    }}
                  />
                }
                label="Enable Dynamic Stop Loss"
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              <TextField
                label="Weak Trend Stop Loss %"
                type="number"
                slotProps={{ htmlInput: { step: 0.1 } }}
                value={settings.weakTrendStopLossPercentage}
                onChange={(e) => handleChange('weakTrendStopLossPercentage', parseFloat(e.target.value))}
                helperText="Tighter stop loss when trend weakens"
                fullWidth
                disabled={!settings.enableDynamicStopLoss}
              />
              <TextField
                label="Trail Arm Buffer %"
                type="number"
                slotProps={{ htmlInput: { step: 0.1 } }}
                value={settings.trailArmBufferPercentage}
                onChange={(e) => handleChange('trailArmBufferPercentage', parseFloat(e.target.value))}
                helperText="Profit buffer before trailing/weak-trend stop activates"
                fullWidth
                disabled={!settings.enableDynamicStopLoss}
              />
              <TextField
                label="Trailing Stop %"
                type="number"
                slotProps={{ htmlInput: { step: 0.1 } }}
                value={settings.trailingStopPercentage}
                onChange={(e) => handleChange('trailingStopPercentage', parseFloat(e.target.value))}
                helperText="Trailing stop percentage from high"
                fullWidth
                disabled={!settings.enableDynamicStopLoss}
              />
            </Box>
          </Paper>

          {/* AI/ML Features */}
          <Paper sx={{ padding: '20px', backgroundColor: '#181a20' }}>
            <Typography variant="h6" sx={{ marginBottom: '15px', color: '#f0b90b' }}>
              AI/ML Features
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableMLPredictions}
                    onChange={(e) => handleChange('enableMLPredictions', e.target.checked)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#0ecb81',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#0ecb81',
                      },
                    }}
                  />
                }
                label="Enable ML Predictions (LSTM)"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableOpenAISignals}
                    onChange={(e) => handleChange('enableOpenAISignals', e.target.checked)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#0ecb81',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#0ecb81',
                      },
                    }}
                  />
                }
                label="Enable OpenAI Signals"
              />
            </Box>
          </Paper>
        </div>
      </div>
    </ThemeProvider>
  );
}

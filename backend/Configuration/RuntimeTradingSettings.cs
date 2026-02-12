namespace MarginCoinAPI.Configuration
{
    /// <summary>
    /// Runtime-adjustable trading settings stored in database.
    /// These are settings that traders may want to adjust frequently without restarting the application.
    /// </summary>
    public class RuntimeTradingSettings
    {
        public int MaxOpenTrades { get; set; } = 3;
        public double QuoteOrderQty { get; set; } = 3000;
        public double StopLossPercentage { get; set; } = 2;
        public double TakeProfitPercentage { get; set; } = 1;
        public int TimeBasedKillMinutes { get; set; } = 30;

        // Aggressive Replacement Settings
        public bool EnableAggressiveReplacement { get; set; } = true;
        public double SurgeScoreThreshold { get; set; } = 1.0;
        public double ReplacementScoreGap { get; set; } = 0.25;
        public int ReplacementCooldownSeconds { get; set; } = 180;
        public int MaxReplacementsPerHour { get; set; } = 4;
        public int MaxCandidateDepth { get; set; } = 30;
        public int MinPositionAgeForReplacementSeconds { get; set; } = 60;

        // Risk Management
        public double WeakTrendStopLossPercentage { get; set; } = 0.5;
        public bool EnableDynamicStopLoss { get; set; } = true;
        public double TrailingStopPercentage { get; set; } = 0.5;
        // Trail arming buffer: percentage above entry before trailing/weak-trend logic activates
        public double TrailArmBufferPercentage { get; set; } = 1.0;

        // AI/ML Features
        public bool EnableMLPredictions { get; set; } = false;
        public bool EnableOpenAISignals { get; set; } = true;
    }
}

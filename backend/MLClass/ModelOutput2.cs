using Microsoft.ML.Data;

namespace MarginCoinAPI.MLClass
{
    public class ModelOutput2
    {
        [ColumnName("PredictedLabel")]
        public string PredictedLabel { get; set; }

        [ColumnName("Score")]
        public float[] Score { get; set; }

        // Additional property for model identification
        public string ModelName { get; set; }
    }
}

using Microsoft.ML.Data;

namespace MarginCoinAPI.MLClass
{
    public class ModelInput2
    {
        [ColumnName("Rsi"), LoadColumn(0)]
        public float Rsi { get; set; }

        [ColumnName("MacdHistN0"), LoadColumn(1)]
        public float MacdHistN0 { get; set; }

        [ColumnName("MacdHistN1"), LoadColumn(2)]
        public float MacdHistN1 { get; set; }

        [ColumnName("MacdHistN2"), LoadColumn(3)]
        public float MacdHistN2 { get; set; }

        [ColumnName("MacdHistN3"), LoadColumn(4)]
        public float MacdHistN3 { get; set; }
    }
}

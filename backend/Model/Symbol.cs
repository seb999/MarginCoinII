using System.ComponentModel.DataAnnotations;

namespace MarginCoinAPI.Model
{
    public class Symbol
    {
        [Key]
        public int Id { get; set; }
        public string SymbolName { get; set; }
        public double? Capitalisation { get; set; }
        public int? Rank { get; set; }
    }
}
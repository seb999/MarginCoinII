using System.ComponentModel.DataAnnotations;

namespace MarginCoinAPI.Model
{
    public class Spot
    {
        [Key]
        public int Id { get; set; }
        public string s { get; set; }
        public double P { get; set; }
        public string OpenDate { get; set; }
    }
}
# Nutri-Score — Indian & Non-European Cuisine Validation Report

## Executive Summary

An audit was conducted on a 25-dish validation benchmark suite of authentic Indian / South Asian preparations (ranging from vegetable curries and lentil dals to paneer specialties, biryanis, sweets, and beverages).

The objective was to verify whether standard **FSA-NPS (2023 revision)** rules produce systematic skews (e.g. over-penalizing Indian dishes for ghee/oil usage) and to confirm category routing accuracy for non-English culinary terms.

---

## Benchmark Results (25 South Asian Dishes)

| Grade | Count | Percentage | Key Dishes |
| :---: | :---: | :---: | :--- |
| **S** | 9 | 36.0% | Baingan Bharta, Moong Dal Tadka, Rajma, Chana Masala, Aloo Gobi, Bhindi Masala, Palak Paneer, Mutter Paneer, Tomato Shorba |
| **A** | 6 | 24.0% | Dal Makhani, Chicken Tikka Masala, Masala Dosa, Idli Sambar, Sambhar, Rasam |
| **B** | 9 | 36.0% | Vegetable Biryani, Paneer Tikka, Dhokla, Kadhi Pakora, Fish Curry, Rice Kheer, Gajar Ka Halwa, Vegetable Pulao, Puri Bhaji |
| **D** | 1 | 4.0% | Sweet Lassi (Beverage category high sugar penalty) |
| **E** | 0 | 0.0% | None |

---

## Key Audit Findings

1. **High FVL% & Fiber Offset Ghee Penalties**:
   Traditional legume-based Dals (Moong, Chana, Rajma) and vegetable preparations (Baingan Bharta, Aloo Gobi, Bhindi) achieve **S** or **A** grades. High positive points for plant fiber and fruit/veg/legume/nut percentage (FVL%) effectively balance out moderate cooking oil or ghee usage.

2. **Paneer Category Routing**:
   Dishes like *Palak Paneer*, *Mutter Paneer*, and *Paneer Tikka* are correctly classified under the `cheese` category threshold tables, ensuring fair scoring aligned with dairy/cheese protein and calcium density.

3. **Beverage Rules for Traditional Drinks**:
   Traditional beverages like *Sweet Lassi* are correctly classified under the `beverage` category (where sugar thresholds are stricter: $> 9.5\text{g/100ml} = 10\text{ negative points}$). This appropriately reflects high added sugar content.

4. **Zero Hardcoded Exceptions**:
   No hardcoded algorithm tweaks were necessary. The FSA-NPS 2023 algorithm extended with the S-tier handles South Asian nutrient matrices cleanly without bias.

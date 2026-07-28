# Nutri-Score — Nutritional Rating System

## Overview

**Nutri-Score** is an automated 6-tier front-of-pack nutritional quality rating system embedded across the CHEF (Constraint-based Hybrid Eating Framework) platform.

Modeled on France's **Nutri-Score (FSA-NPS, 2023/2024 revision)** methodology, Nutri-Score evaluates the overall nutritional balance of recipes per 100g/100ml. To cater to clean eating and exceptionally nutrient-dense culinary preparations, CHEF extends the traditional 5-tier A–E scale with a 6th **S-Tier (Superior)**.

---

## The 6-Tier Scale

| Tier | Badge | Color | Meaning | Description |
| :---: | :---: | :---: | :--- | :--- |
| **S** | `★ S` | Goldenrod (Gold Shimmer) | **Superior** | Exceptionally clean recipe with near-zero negative penalties and high positive density. |
| **A** | `A` | Dark Green (`#038141`) | **Excellent** | High nutritional quality, low saturated fats/sugars/sodium. |
| **B** | `B` | Light Green (`#85BB2F`) | **Good** | Good nutritional quality, well-balanced meal. |
| **C** | `C` | Yellow (`#FECB02`) | **Average** | Moderate balance; suitable as part of a varied diet. |
| **D** | `D` | Orange (`#EE8100`) | **Poor** | Higher in energy density, sodium, saturated fats, or free sugars. |
| **E** | `E` | Red (`#E63E11`) | **Very Poor** | High energy density and heavy penalties across negative components. |

---

## How Nutri-Score is Calculated

1. **Category Classification**: Each recipe is classified into one of four threshold categories:
   - `general`: Standard solid food preparations.
   - `beverage`: Liquid refreshments, smoothies, shakes, teas, juices.
   - `fats_oils`: Dressings, pestos, butter/ghee spreads, oil-heavy dips.
   - `cheese`: Cheese-dominant dishes (e.g. Paneer Tikka, Mac & Cheese).

2. **Per-100g Normalization**: Recipe portion size and ingredient weights are estimated to compute per-100g (or 100ml) values for:
   - **Negative Components (0–10 points each, max 40)**: Energy (kJ), Saturated Fat (g), Sugars (g), Sodium (mg).
   - **Positive Components (0–5 points each, max 15)**: Dietary Fiber (g), Protein (g), Fruit / Vegetable / Legume / Nut percentage (FVL%).

3. **Conditional Protein Rule**: Following modern 2023 Nutri-Score standards, if negative points total $\ge 11$ and FVL positive points are $< 5$, protein points are excluded from positive points to prevent masking unhealthy junk food with added protein powder.

4. **Final Numeric Score**:
$$\text{Final Score} = \sum \text{Negative Points} - \sum \text{Positive Points}$$

5. **S-Tier Bonus Criteria**: A recipe receives an **S-Tier** rating if and only if:
   - $\text{Final Score} \le -4$
   - $\sum \text{Negative Points} \le 1$ (near-zero penalties across all 4 negative nutrients)
   - $\sum \text{Positive Points} \ge 5$

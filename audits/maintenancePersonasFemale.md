# Maintenance targets — female personas, lightest to heaviest

Daily calorie and macro targets produced by the PLATES dev-hub calculator for 10 hypothetical female users, each with the goal **maintain current weight**. Every number is the actual output of the calculator for that body — nothing is hand-adjusted. Rows are ordered lightest to heaviest.

Activity levels use the app's own definitions:

- **Sedentary** — sitting most of the day, and little to no exercise
- **Light** — a bit of walking most days, or exercise 1-3 days a week
- **Moderate** — up and about a fair amount, or exercise 3-5 days a week
- **Active** — moving most of the day, or exercise 6-7 days a week
- **Extremely Active** — moving all day and exercising most days

## Who they are, and their calorie target

The calculator runs on whichever unit system the user stores. Heights and weights in brackets are conversions, carried to enough decimals to reproduce the calorie figure — round them further and the arithmetic will not come out.

| # | Persona | Age | Height | Weight | Activity | Maintenance kcal/day |
|---|---------|-----|--------|--------|----------|----------------------|
| 1 | Tiny older sedentary woman | 68 | 4'11" (149.86 cm) | 92 lb (41.73 kg) | Sedentary | 1,024 (under the 1,200 kcal daily minimum for women — the app shows a warning) |
| 2 | Petite sedentary woman | 28 | 5'0" (152.40 cm) | 105 lb (47.63 kg) | Sedentary | 1,353 |
| 3 | Young lightly active woman | 22 | 5'2" (157.48 cm) | 118 lb (53.52 kg) | Light | 1,717 |
| 4 | Older lightly active woman | 58 | 5'3" (160.02 cm) | 130 lb (58.97 kg) | Light | 1,566 |
| 5 | Moderately active woman (metric) | 27 | 165 cm | 62 kg (136.7 lb) | Moderate | 2,101 |
| 6 | Average sedentary woman | 35 | 5'4" (162.56 cm) | 140 lb (63.50 kg) | Sedentary | 1,578 |
| 7 | Active woman | 30 | 5'6" (167.64 cm) | 150 lb (68.04 kg) | Active | 2,445 |
| 8 | Extremely active woman (athlete) | 26 | 5'8" (172.72 cm) | 160 lb (72.57 kg) | Extremely Active | 2,877 |
| 9 | Tall active woman (metric) | 33 | 178 cm | 80 kg (176.4 lb) | Active | 2,737 |
| 10 | Heavy sedentary woman | 42 | 5'5" (165.10 cm) | 220 lb (99.79 kg) | Sedentary | 1,991 |

## Their macro targets

g/kg is grams per kilogram of bodyweight; % is the share of the day's calories.

| # | Persona | kcal | Protein | Fat | Carbs | Macro kcal sum |
|---|---------|------|---------|-----|-------|----------------|
| 1 | Tiny older sedentary woman | 1,024 | 64 g (1.53 g/kg · 25%) | 35 g (0.84 g/kg · 31%) | 113 g (2.71 g/kg · 44%) | 1,023 |
| 2 | Petite sedentary woman | 1,353 | 74 g (1.55 g/kg · 22%) | 35 g (0.73 g/kg · 23%) | 185 g (3.88 g/kg · 55%) | 1,351 |
| 3 | Young lightly active woman | 1,717 | 94 g (1.76 g/kg · 22%) | 45 g (0.84 g/kg · 24%) | 235 g (4.39 g/kg · 55%) | 1,721 |
| 4 | Older lightly active woman | 1,566 | 104 g (1.76 g/kg · 27%) | 38 g (0.64 g/kg · 22%) | 201 g (3.41 g/kg · 51%) | 1,562 |
| 5 | Moderately active woman (metric) | 2,101 | 123 g (1.98 g/kg · 23%) | 54 g (0.87 g/kg · 23%) | 282 g (4.55 g/kg · 54%) | 2,106 |
| 6 | Average sedentary woman | 1,578 | 98 g (1.54 g/kg · 25%) | 40 g (0.63 g/kg · 23%) | 208 g (3.28 g/kg · 53%) | 1,584 |
| 7 | Active woman | 2,445 | 150 g (2.20 g/kg · 25%) | 62 g (0.91 g/kg · 23%) | 323 g (4.75 g/kg · 53%) | 2,450 |
| 8 | Extremely active woman (athlete) | 2,877 | 176 g (2.43 g/kg · 24%) | 72 g (0.99 g/kg · 23%) | 380 g (5.24 g/kg · 53%) | 2,872 |
| 9 | Tall active woman (metric) | 2,737 | 176 g (2.20 g/kg · 26%) | 68 g (0.85 g/kg · 22%) | 356 g (4.45 g/kg · 52%) | 2,740 |
| 10 | Heavy sedentary woman | 1,991 | 154 g (1.54 g/kg · 31%) | 60 g (0.60 g/kg · 27%) | 209 g (2.09 g/kg · 42%) | 1,992 |

Two things in that table are easy to misread:

- **Fat is the largest of three candidates**, not a percentage: 35 g flat, 0.6 g per kg of bodyweight, or 30% of the calories left after protein. Most rows land on the 30% share. A row reading exactly **0.60 g/kg** is one where that share came out smaller than the per-kg floor, so the floor is what set it.
- **The macro kcal sum runs a few kcal either side of the target.** Grams are whole numbers and a gram of fat is 9 kcal, so the printed grams cannot multiply back out exactly. Across these rows the gap is -5 to +6 kcal.

# Maintenance targets — male personas, lightest to heaviest

Daily calorie and macro targets produced by the PLATES dev-hub calculator for 10 hypothetical male users, each with the goal **maintain current weight**. Every number is the actual output of the calculator for that body — nothing is hand-adjusted. Rows are ordered lightest to heaviest.

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
| 1 | Slim young sedentary man | 21 | 5'7" (170.18 cm) | 135 lb (61.24 kg) | Sedentary | 1,891 |
| 2 | Short lightly active man | 36 | 5'5" (165.10 cm) | 150 lb (68.04 kg) | Light | 2,114 |
| 3 | Older moderately active man | 62 | 5'8" (172.72 cm) | 165 lb (74.84 kg) | Moderate | 2,361 |
| 4 | Average sedentary man | 40 | 5'9" (175.26 cm) | 170 lb (77.11 kg) | Sedentary | 2,006 |
| 5 | Moderately active man (metric) | 33 | 178 cm | 82 kg (180.8 lb) | Moderate | 2,747 |
| 6 | Tall young lightly active man | 24 | 6'3" (190.50 cm) | 190 lb (86.18 kg) | Light | 2,664 |
| 7 | Active man | 30 | 5'11" (180.34 cm) | 200 lb (90.72 kg) | Active | 3,259 |
| 8 | Large extremely active man | 29 | 6'2" (187.96 cm) | 230 lb (104.33 kg) | Extremely Active | 3,948 |
| 9 | Heavy sedentary man | 45 | 6'0" (182.88 cm) | 260 lb (117.93 kg) | Sedentary | 2,523 |
| 10 | Very heavy sedentary man | 55 | 5'10" (177.80 cm) | 310 lb (140.61 kg) | Sedentary | 2,697 |

## Their macro targets

g/kg is grams per kilogram of bodyweight; % is the share of the day's calories.

| # | Persona | kcal | Protein | Fat | Carbs | Macro kcal sum |
|---|---------|------|---------|-----|-------|----------------|
| 1 | Slim young sedentary man | 1,891 | 95 g (1.55 g/kg · 20%) | 50 g (0.82 g/kg · 24%) | 264 g (4.31 g/kg · 56%) | 1,886 |
| 2 | Short lightly active man | 2,114 | 120 g (1.76 g/kg · 23%) | 54 g (0.79 g/kg · 23%) | 286 g (4.20 g/kg · 54%) | 2,110 |
| 3 | Older moderately active man | 2,361 | 149 g (1.99 g/kg · 25%) | 59 g (0.79 g/kg · 22%) | 309 g (4.13 g/kg · 52%) | 2,363 |
| 4 | Average sedentary man | 2,006 | 119 g (1.54 g/kg · 24%) | 51 g (0.66 g/kg · 23%) | 268 g (3.48 g/kg · 53%) | 2,007 |
| 5 | Moderately active man (metric) | 2,747 | 163 g (1.99 g/kg · 24%) | 70 g (0.85 g/kg · 23%) | 367 g (4.48 g/kg · 53%) | 2,750 |
| 6 | Tall young lightly active man | 2,664 | 152 g (1.76 g/kg · 23%) | 69 g (0.80 g/kg · 23%) | 360 g (4.18 g/kg · 54%) | 2,669 |
| 7 | Active man | 3,259 | 200 g (2.20 g/kg · 25%) | 82 g (0.90 g/kg · 23%) | 430 g (4.74 g/kg · 53%) | 3,258 |
| 8 | Large extremely active man | 3,948 | 253 g (2.43 g/kg · 26%) | 98 g (0.94 g/kg · 22%) | 514 g (4.93 g/kg · 52%) | 3,950 |
| 9 | Heavy sedentary man | 2,523 | 182 g (1.54 g/kg · 29%) | 71 g (0.60 g/kg · 25%) | 290 g (2.46 g/kg · 46%) | 2,527 |
| 10 | Very heavy sedentary man | 2,697 | 217 g (1.54 g/kg · 32%) | 84 g (0.60 g/kg · 28%) | 267 g (1.90 g/kg · 40%) | 2,692 |

Two things in that table are easy to misread:

- **Fat is the largest of three candidates**, not a percentage: 35 g flat, 0.6 g per kg of bodyweight, or 30% of the calories left after protein. Most rows land on the 30% share. A row reading exactly **0.60 g/kg** is one where that share came out smaller than the per-kg floor, so the floor is what set it.
- **The macro kcal sum runs a few kcal either side of the target.** Grams are whole numbers and a gram of fat is 9 kcal, so the printed grams cannot multiply back out exactly. Across these rows the gap is -5 to +5 kcal.

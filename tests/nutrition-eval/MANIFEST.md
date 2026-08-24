# Nutrition eval set - manifest

Built 2026-08-19. **50 images** across 25 meals, 10 products, 15 labels.

Every row's macros come from the **same source page as the photo**. No estimated or model-generated numbers appear in this file - see the tier column.

## How to read this

- **basis** - `per_serving` means the numbers describe one portion as served; `per_100g` means per 100 grams of product. Mixing these silently is the most common way a nutrition dataset goes wrong, so it is explicit on every row.

- **tier** - `panel`: values printed on a nutrition panel, where the panel is the image itself. `publisher`: official values published by the brand or site alongside that exact photo.

- **check** - Atwater deviation, i.e. how far `4P + 4C + 9F` sits from the stated calories. Under ~10% is normal label rounding; anything above 25% was rejected.

- **v** - independent verification verdict. An agent opened the image and compared what it could actually see against the recorded values. `pass` = matched, `suspect` = disagreed or could not be confirmed, `fail` = unusable, `-` = not verified.


## Meals (25)

Plated dishes and restaurant menu items. One photo = one portion.

| # | image | item | source | basis | serving | kcal | P (g) | C (g) | F (g) | tier | check | v |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | [`meal-a1-01.png`](images/meals/meal-a1-01.png) | Harvest Bowl | [Sweetgreen](https://www.sweetgreen.com/menu) | `per_serving` | 1 bowl | 740 | 32 | 60 | 41 | publisher | 0% | pass |
| 2 | [`meal-a1-02.png`](images/meals/meal-a1-02.png) | Crispy Rice Bowl | [Sweetgreen](https://www.sweetgreen.com/menu) | `per_serving` | 1 bowl | 640 | 28 | 61 | 30 | publisher | 2% | pass |
| 3 | [`meal-a1-03.png`](images/meals/meal-a1-03.png) | Chicken Sesame Crunch | [Sweetgreen](https://www.sweetgreen.com/menu) | `per_serving` | 1 salad | 615 | 35 | 54 | 29 | publisher | 0% | pass |
| 4 | [`meal-a1-04.png`](images/meals/meal-a1-04.png) | Kale Caesar | [Sweetgreen](https://www.sweetgreen.com/menu) | `per_serving` | 1 salad | 545 | 41 | 18 | 35 | publisher | 1% | suspect |
| 5 | [`meal-a1-05.png`](images/meals/meal-a1-05.png) | Miso Glazed Salmon | [Sweetgreen](https://www.sweetgreen.com/menu) | `per_serving` | 1 protein plate | 930 | 35 | 88 | 48 | publisher | 1% | pass |
| 6 | [`meal-a2-01.jpg`](images/meals/meal-a2-01.jpg) | Double-Smoked Bacon, Cheddar & Egg Sandwich | [Starbucks](https://www.starbucks.com/menu/product/2121219/single) | `per_serving` | 1 serving (148 g) | 500 | 21 | 43 | 27 | publisher | 0% | pass |
| 7 | [`meal-a2-02.jpg`](images/meals/meal-a2-02.jpg) | Spinach, Feta & Egg White Wrap | [Starbucks](https://www.starbucks.com/menu/product/371/single) | `per_serving` | 1 serving (159 g) | 290 | 20 | 34 | 8 | publisher | 1% | pass |
| 8 | [`meal-a2-03.jpg`](images/meals/meal-a2-03.jpg) | Bacon & Gruyere Egg Bites | [Starbucks](https://www.starbucks.com/menu/product/2122116/single) | `per_serving` | 1 serving (130 g) | 300 | 19 | 9 | 20 | publisher | 3% | pass |
| 9 | [`meal-a2-04.jpg`](images/meals/meal-a2-04.jpg) | Toasted Chicken & Avocado Sandwich | [Au Bon Pain](https://www.aubonpain.com/(GetProductDetails)/menu?id=489) | `per_serving` | 1 Sandwich / 10.7 oz ( | 620 | 37 | 67 | 24 | publisher | 2% | suspect |
| 10 | [`meal-a2-05.jpg`](images/meals/meal-a2-05.jpg) | ABP's Original Chicken Salad Sandwich | [Au Bon Pain](https://www.aubonpain.com/(GetProductDetails)/menu?id=207) | `per_serving` | 1 Sandwich / 7.5 oz (2 | 500 | 26 | 38 | 27 | publisher | 0% | pass |
| 11 | [`meal-a3-01.jpg`](images/meals/meal-a3-01.jpg) | Chick-fil-A Chicken Sandwich | [Chick-fil-A](https://www.chick-fil-a.com/menu/entrees/chick-fil-a-chicken-sandwich) | `per_serving` | 1 sandwich | 420 | 29 | 41 | 18 | publisher | 5% | pass |
| 12 | [`meal-a3-02.jpg`](images/meals/meal-a3-02.jpg) | Spicy Chicken Sandwich | [Chick-fil-A](https://www.chick-fil-a.com/menu/entrees/spicy-chicken-sandwich) | `per_serving` | 1 sandwich | 450 | 28 | 45 | 19 | publisher | 3% | pass |
| 13 | [`meal-a3-03.jpg`](images/meals/meal-a3-03.jpg) | Chick-fil-A Cool Wrap | [Chick-fil-A](https://www.chick-fil-a.com/menu/entrees/chick-fil-a-cool-wrap) | `per_serving` | 1 wrap | 660 | 43 | 32 | 45 | publisher | 7% | pass |
| 14 | [`meal-a3-04.jpg`](images/meals/meal-a3-04.jpg) | 8 ct Chick-fil-A Nuggets | [Chick-fil-A](https://www.chick-fil-a.com/menu/entrees/8-ct-chick-fil-a-nuggets) | `per_serving` | 1 order (8 nuggets) | 250 | 27 | 11 | 11 | publisher | 0% | pass |
| 15 | [`meal-a3-05.jpg`](images/meals/meal-a3-05.jpg) | Mac & Cheese | [Chick-fil-A](https://www.chick-fil-a.com/menu/sides/mac-cheese) | `per_serving` | 1 side portion | 450 | 20 | 28 | 29 | publisher | 1% | suspect |
| 16 | [`meal-a4-01.jpg`](images/meals/meal-a4-01.jpg) | Sweet n' Spicy Chicken Bowls | [Budget Bytes](https://www.budgetbytes.com/sweet-n-spicy-chicken-bowls/) | `per_serving` | 1 of 4 servings (1 bow | 389.95 | 23.48 | 50.55 | 10.43 | publisher | 0% | pass |
| 17 | [`meal-a4-02.jpg`](images/meals/meal-a4-02.jpg) | Shrimp and Grits | [Budget Bytes](https://www.budgetbytes.com/shrimp-and-grits/) | `per_serving` | 1 of 4 servings (1 cup | 468 | 28 | 40 | 21 | publisher | 1% | pass |
| 18 | [`meal-a4-03.jpg`](images/meals/meal-a4-03.jpg) | Garlic Noodles with Beef and Broccoli | [Budget Bytes](https://www.budgetbytes.com/garlic-noodles-with-beef-and-broccoli/) | `per_serving` | 1 of 4 servings (1 pla | 555.85 | 14.95 | 60.28 | 28.08 | publisher | 0% | pass |
| 19 | [`meal-a4-04.jpg`](images/meals/meal-a4-04.jpg) | Salmon Bowl (teriyaki salmon, brown rice, ed | [Well Plated by Erin](https://www.wellplated.com/salmon-quinoa-bowl/) | `per_serving` | 1 of 4 servings (1 bow | 659 | 45 | 60 | 27 | publisher | 1% | pass |
| 20 | [`meal-a4-05.jpg`](images/meals/meal-a4-05.jpg) | Curry Lentil Soup | [Well Plated by Erin](https://www.wellplated.com/curry-lentil-soup/) | `per_serving` | 1 of 4 servings (about | 334 | 19 | 47 | 10 | publisher | 6% | suspect |
| 21 | [`meal-a5-01.jpg`](images/meals/meal-a5-01.jpg) | Cheat's ramen noodle soup | [BBC Good Food](https://www.bbcgoodfood.com/recipes/japanese-ramen-noodle-soup) | `per_serving` | 1 bowl of ramen (1 of  | 629 | 51 | 75 | 13.01 | publisher | 1% | pass |
| 22 | [`meal-a5-02.jpg`](images/meals/meal-a5-02.jpg) | Huevos rancheros | [BBC Good Food](https://www.bbcgoodfood.com/recipes/huevos-rancheros) | `per_serving` | 1 plate: 1 tortilla wi | 540 | 21 | 44 | 29 | publisher | 4% | pass |
| 23 | [`meal-a5-03.jpg`](images/meals/meal-a5-03.jpg) | Spicy beef taco bowl | [BBC Good Food](https://www.bbcgoodfood.com/recipes/spicy-beef-taco-bowl) | `per_serving` | 1 bowl: brown rice, sp | 601 | 38 | 56 | 21 | publisher | 6% | pass |
| 24 | [`meal-a5-04.jpg`](images/meals/meal-a5-04.jpg) | Creamy Tomato and Spinach Pasta | [Budget Bytes](https://www.budgetbytes.com/creamy-tomato-spinach-pasta/) | `per_serving` | 1 serving (1 of 4), pl | 363 | 13 | 54 | 11 | publisher | 1% | suspect |
| 25 | [`meal-a5-06.jpg`](images/meals/meal-a5-06.jpg) | Red lentil, chickpea & chilli soup | [BBC Good Food](https://www.bbcgoodfood.com/recipes/red-lentil-chickpea-chilli-soup) | `per_serving` | 1 bowl of soup with it | 259 | 17 | 33 | 5 | publisher | 5% | pass |

## Packaged products (10)

Front-of-pack shots. Macros are per 100g from the product's database entry, so recognition has to run through brand and packaging rather than the food itself.

| # | image | item | source | basis | serving | kcal | P (g) | C (g) | F (g) | tier | check | v |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | [`product-off-01.jpg`](images/products/product-off-01.jpg) | Nissin Demae Ramen Chicken Flavour | [Nissin](https://world.openfoodfacts.org/product/4897878140022) | `per_100g` | - | 470 | 10 | 60 | 21 | panel | 0% | pass |
| 2 | [`product-off-02.jpg`](images/products/product-off-02.jpg) | Parmigiano reggiano | [Bio Hombre](https://world.openfoodfacts.org/product/2935306002206) | `per_100g` | - | 392 | 33 | 0 | 28.4 | panel | 1% | pass |
| 3 | [`product-off-03.jpg`](images/products/product-off-03.jpg) | Crispy and thin chocolat | [Oreo](https://world.openfoodfacts.org/product/7622210650719) | `per_100g` | - | 488 | 5.4 | 69 | 20 | panel | 2% | pass |
| 4 | [`product-off-04.jpg`](images/products/product-off-04.jpg) | Organic Oven Roasted Chicken Breast | [Trader Joe's](https://world.openfoodfacts.org/product/00626668) | `per_100g` | 2 slices (56 g) | 107 | 21.4 | 1.8 | 1.8 | panel | 2% | pass |
| 5 | [`product-off-05.jpg`](images/products/product-off-05.jpg) | Potato chips | [Lay's](https://world.openfoodfacts.org/product/0028400091565) | `per_100g` | 1 package (42.5 g) | 564.7 | 7.1 | 54.1 | 35.3 | panel | 0% | pass |
| 6 | [`product-off-06.jpg`](images/products/product-off-06.jpg) | Cocobar Chocolate | [Coconama](https://world.openfoodfacts.org/product/16999299) | `per_100g` | 33g | 576 | 9.1 | 48.5 | 36.4 | panel | 3% | pass |
| 7 | [`product-off-07.jpg`](images/products/product-off-07.jpg) | Petites Pissaladières | [Maison Tino](https://world.openfoodfacts.org/product/3338310018864) | `per_100g` | 105 g | 320 | 4.3 | 11 | 28 | panel | 2% | pass |
| 8 | [`product-off-08.jpg`](images/products/product-off-08.jpg) | Actimel Kids - Peach | [Actimel](https://world.openfoodfacts.org/product/5060360506852) | `per_100g` | - | 63 | 3.3 | 9.1 | 1.4 | panel | 1% | pass |
| 9 | [`product-off-10.jpg`](images/products/product-off-10.jpg) | Peanut Butter Sweetened Multi-Grain Toasted  | [Kroger](https://world.openfoodfacts.org/product/0011110030726) | `per_100g` | 37g | 405.4 | 8.1 | 81.1 | 5.4 | panel | 0% | pass |
| 10 | [`product-off-11.jpg`](images/products/product-off-11.jpg) | Roomboter Appelkoeken | [Hema](https://world.openfoodfacts.org/product/2010194599998) | `per_100g` | - | 392 | 3.5 | 63 | 13.7 | panel | 1% | pass |

## Nutrition labels (15)

Photographs of nutrition panels. This is the OCR/parse test set - the ground truth is printed inside the image.

| # | image | item | source | basis | serving | kcal | P (g) | C (g) | F (g) | tier | check | v |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | [`label-off-01.jpg`](images/labels/label-off-01.jpg) | Biscuits à l'avoine morceaux de chocolat | [Sarah Lee](https://world.openfoodfacts.org/product/10533352) | `per_100g` | 50g | 420 | 6 | 64 | 16 | panel | 1% | suspect |
| 2 | [`label-off-02.jpg`](images/labels/label-off-02.jpg) | Snack frit passé au four | [Vialatina](https://world.openfoodfacts.org/product/8031993000571) | `per_100g` | - | 503 | 9.8 | 61 | 24 | panel | 1% | pass |
| 3 | [`label-off-03.jpg`](images/labels/label-off-03.jpg) | Pecorino Romano PDO | [Lovilio](https://world.openfoodfacts.org/product/20053451) | `per_100g` | - | 397 | 25 | 0 | 33 | panel | 0% | pass |
| 4 | [`label-off-04.jpg`](images/labels/label-off-04.jpg) | Tropical Juice with kale | [Marks & Spencer](https://world.openfoodfacts.org/product/00976510) | `per_100g` | 250 ml | 48 | 0.3 | 11.4 | 0.1 | panel | 1% | pass |
| 5 | [`label-off-05.jpg`](images/labels/label-off-05.jpg) | Grapeseed Oil | [Star,   Star Fine Fo0ds ](https://world.openfoodfacts.org/product/0073210001839) | `per_100ml` | 1 Tbsp (15 ml) | 866.7 | 0 | 0 | 93.3 | panel | 3% | suspect |
| 6 | [`label-off-06.jpg`](images/labels/label-off-06.jpg) | Frosted s'mores toaster pastries, frosted s' | [Kellogg's](https://world.openfoodfacts.org/product/0038000321108) | `per_100g` | 1 Pastry (52 g) | 385 | 5.8 | 69.2 | 9.6 | panel | 0% | pass |
| 7 | [`label-off-07.jpg`](images/labels/label-off-07.jpg) | Brown lentils | [Agro Fusion](https://world.openfoodfacts.org/product/87260403) | `per_100g` | 48g | 354 | 27.1 | 60.4 | 2.1 | panel | 4% | suspect |
| 8 | [`label-off-08.jpg`](images/labels/label-off-08.jpg) | Carottes râpées | [LE PRIX GAGNANT !](https://world.openfoodfacts.org/product/3263859478612) | `per_100g` | - | 82 | 0.9 | 4.8 | 6.1 | panel | 5% | pass |
| 9 | [`label-off-09.jpg`](images/labels/label-off-09.jpg) | Chocolate & Vanilla Cheesecakes | [Gü](https://world.openfoodfacts.org/product/5060425281182) | `per_100g` | 78g | 403 | 4.3 | 36.3 | 26.4 | panel | 1% | pass |
| 10 | [`label-off-11.jpg`](images/labels/label-off-11.jpg) | Cheddar Jack Shredded Cheese | [Giant](https://world.openfoodfacts.org/product/0688267588839) | `per_100g` | 0.25 cup (28 g) | 393 | 21.4 | 3.6 | 32.1 | panel | 1% | pass |
| 11 | [`label-off-12.jpg`](images/labels/label-off-12.jpg) | Milk chocolate, peanut butter cup miniatures | [Hershey's](https://world.openfoodfacts.org/product/0034000448609) | `per_100g` | 5 pieces (44 g) | 500 | 9.1 | 59.1 | 29.6 | panel | 8% | pass |
| 12 | [`label-off-13.jpg`](images/labels/label-off-13.jpg) | Couscous mieux etre | [Metro](https://world.openfoodfacts.org/product/0059749901468) | `per_100g` | - | 311.1 | 13.3 | 62.2 | 1.1 | panel | 0% | pass |
| 13 | [`label-off-15.jpg`](images/labels/label-off-15.jpg) | Apricot yoghurt | [Ferme des Peupliers](https://world.openfoodfacts.org/product/3374270040453) | `per_100g` | - | 96.3 | 3.3 | 15.3 | 2.4 | panel | 0% | suspect |
| 14 | [`label-off-16.jpg`](images/labels/label-off-16.jpg) | Dark chocolate butter biscuits | [Tesco](https://world.openfoodfacts.org/product/5051277445525) | `per_100g` | 14g | 511 | 6.9 | 58.3 | 26.7 | panel | 2% | pass |
| 15 | [`label-off-17.jpg`](images/labels/label-off-17.jpg) | Mcvitie's Dark Chocolate Digestive Thins | [Mcvitie, United Biscuits](https://world.openfoodfacts.org/product/5000168198392) | `per_100g` | 6g | 512 | 6.4 | 60.1 | 26.3 | panel | 2% | pass |

## Flagged by verification

These are still in the set, but do not treat them as clean ground truth without a look:

- **meal-a1-04** (suspect) - Right dish and one serving, but the plated volume of bread-textured crisp pieces (several show an open crumb and crust edge in the lower right, i.e. focaccia crouton rather than cheese crisp) looks larger than the 18 g total carbs allows once the greens are subtracted (~12 g leaves roughly 20 g of bread). If those pieces are parmesan crisps the row is fine; from the photo alone it is not resolvable, so a vision model could reasonably over-count carbs here.
- **meal-a2-04** (suspect) - Right item, but portion count is genuinely ambiguous: the two pieces are separated and rotated (one cut face to camera, one facing away) rather than presented as an obviously matched pair, and each reads as a full-width focaccia sandwich. Most likely one 303 g sandwich cut in half, but the frame supports reading it as two servings, which is exactly the failure mode this check targets.
- **meal-a3-05** (suspect) - Right item and exactly one portion, but the portion the photo depicts is ambiguous against the macros. The row states no portion weight and the source asset is named for a 5 oz cup; 450 kcal in 5 oz (~142 g) is ~3.2 kcal/g and 20% fat by weight, above the plausible density for macaroni in cheese sauce (~2.0-2.5 kcal/g). That points to the published 450 / 20P / 28C / 29F describing a larger size than the small cup pictured. The macros are internally consistent (Atwater 453 vs 450), so the doubt is photo-vs-size, not arithmetic. Cannot resolve from the image alone; flagging rather than passing.
- **meal-a4-05** (suspect) - CONFIRMING the collecting agent's flag. The soup itself is exactly one bowl and matches '1 of 4, about 1 1/3 cups'. But the naan is real, recognisable bread inside the frame and is excluded from the 334 kcal / 47g carb block, so any vision estimate that reads the whole frame overshoots carbs and calories.
- **meal-a5-04** (suspect) - CONFIRMING the collecting agent's flag on the bread, and adding two things it under-weighted: the second plate at the top-left is sharp rather than blurred, and the loose parmesan pile is substantial. The foreground plate also reads as a large portion for only 363 kcal / 11g fat for a cream-sauce pasta. Right dish and roughly one serving, but the frame carries clearly excluded food.
- **label-off-01** (suspect) - Canadian bilingual panel is fully legible but is declared 'pour 1 biscuit (50 g) / Per 1 cookie (50 g)' only: Calories 210, Fat 8 g, Carbohydrate 32 g, Protein 3 g. Serving size in grams is printed, so per-100g = 2x serving = 420 kcal / P6 / C64 / F16. The recorded per-100g values (210/3/32/8) are exactly the per-SERVING column, i.e. off by 2x (100%) on every macro. Row notes claim 'per-serving on pack: 105kcal P1.5 C16 F4', which is half of what the pack actually prints, corroborating that the per-100g basis was mis-keyed from the 50 g serving column.
- **label-off-05** (suspect) - US FDA panel is legible but per-serving only, and the serving is VOLUMETRIC: 'Serving size 1 tbsp (15mL)', 130 kcal, Total Fat 14 g, Total Carbohydrate 0 g, Protein 0 g. Scaling by volume gives 866.7 kcal and 93.3 g fat per 100 mL, which reproduces the recorded values exactly, so OFF treated 15 mL as 15 g. Per 100 GRAMS cannot be confirmed from the panel: using grapeseed oil density ~0.92 g/mL the serving is ~13.8 g, giving ~942 kcal and ~101 g fat per 100 g, which is physically impossible (>100 g fat per 100 g) and ~9% above the recorded figures. True per-100g for a pure oil is ~884 kcal / 100 g fat. The recorded numbers are therefore per 100 ml mislabelled as per_100g; the panel fields above are the volume-based reading, not a confirmed per-100g measurement.
- **label-off-07** (suspect) - Canadian bilingual panel is per 1/4 cup (48 g): 170 kcal, fat 1g, carb 29g, fibre 15g, protein 13g. The recorded per-100g row (170/13/29/1) is byte-for-byte the PER-SERVING column, so the basis is mis-keyed: true per-100g is 354 kcal, P 27.1, C 60.4, F 2.1 (~2.08x higher, ~108% error). Dry brown lentils at ~350 kcal/100g corroborates the converted value, not the recorded one.
- **label-off-15** (suspect) - EU panel printed directly per 100 g and fully legible: 'Energie 394 kJ / 93.4 kcal, Matieres Grasses 2.5 g, dont acides gras satures 1.7 g, Glucides 14.3 g, dont sucres 13.6 g, Proteines 3.4 g, Sel 0.1 g' (394 kJ / 4.184 = 94.2 kcal, consistent). Carbs disagree: panel 14.3 vs recorded 15.3, a 7.0% gap (>5%) and a plausible mis-key. Energy 93.4 vs recorded 96.3 is 3.1% off, protein 3.4 vs 3.3 is 2.9% off, fat 2.5 vs 2.4 is 4.0% off -- each individually inside tolerance but all skewed the same direction, consistent with a different product revision. Product identity is fine (Au bon lait de Normandie apricot yoghurt, apricot puree 17%, FR 27-247-001 CE).

## Rejected (1)

Candidates that failed validation and are **not** part of the set:

1. `meal-a5-05` - verification found the fries are plated on the subject plate, in focus, at roughly equal visual mass to the sandwich, and are excluded from the 864 kcal block - a model that correctly sees that food would be scored wrong [removed from fragment upstream]

## Provenance and licensing

| source | rows | image licence |
|---|---|---|
| world.openfoodfacts.org | 25 | CC-BY-SA-3.0 (image) / ODbL (data), Open Food Facts |
| www.sweetgreen.com | 5 | proprietary-marketing-asset |
| www.chick-fil-a.com | 5 | proprietary-marketing-asset |
| www.budgetbytes.com | 4 | proprietary-editorial-asset |
| www.bbcgoodfood.com | 4 | proprietary-editorial-asset |
| www.starbucks.com | 3 | proprietary-marketing-asset |
| www.aubonpain.com | 2 | proprietary-marketing-asset |
| www.wellplated.com | 2 | proprietary-editorial-asset |

Open Food Facts images are CC-BY-SA 3.0 and its data is ODbL, so they are free to redistribute with attribution. Rows marked `proprietary-*` are third-party editorial or marketing assets, taken only from sources whose robots.txt permits agent access. They are fine for local evaluation, but check each publisher's terms before redistributing them publicly.


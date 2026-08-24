# nutrition-eval

Self-contained eval set for a photo → nutrition pipeline. 50 images with ground-truth calories
and macros: 25 meals, 10 packaged products, 15 nutrition labels.

Drop this whole folder into any project. Nothing outside it is referenced — image paths in the
data are relative to this directory, so `nutrition-eval/eval_set.json` plus `nutrition-eval/images/`
is the entire dependency.

```
nutrition-eval/
├── eval_set.json     50 rows, single array — easiest to import
├── eval_set.jsonl    same rows, line-delimited — easiest to stream
├── MANIFEST.md       human-readable table of every row
└── images/{meals,products,labels}/
```

## Load it

```python
import json, pathlib

ROOT = pathlib.Path(__file__).parent / "nutrition-eval"
rows = json.loads((ROOT / "eval_set.json").read_text(encoding="utf-8"))

for r in rows:
    img = ROOT / r["image"]          # resolves regardless of cwd
    truth = (r["calories"], r["protein_g"], r["carbs_g"], r["fat_g"])
```

## Read this before you score anything

**1. `basis` is not the same on every row.** `per_serving` (25 rows) means the numbers describe one
portion as served. `per_100g` (24 rows) means per 100 grams of product. One row is `per_100ml`.
Scoring a `per_100g` row against a model that estimated a whole portion produces a large,
meaningless error. Branch on it:

```python
if r["basis"] == "per_serving":
    ...  # compare against a whole-portion estimate
else:
    ...  # compare against a per-100g estimate, or scale using serving_size_g
```

Meals are `per_serving`. Products and labels are `per_100g`, so for those the meaningful question is
"did it read or recognise the product correctly", not "did it judge the portion".

**2. Use `is_clean` for a strict subset.** 41 of 50 rows passed independent verification; the other 9
are `suspect` — kept deliberately, each with a stated reason, because they are still useful for
robustness testing.

```python
clean = [r for r in rows if r["is_clean"]]                    # 41 rows, safe to score
labels = [r for r in rows if r["class"] == "label"]           # OCR / panel-parsing test
```

**3. `serving_size_g` is null on 24 rows.** Most restaurants and recipe sites publish a portion name
("1 bowl", "1 of 4 servings") but no gram weight. These were left null rather than estimated — do not
treat null as zero.

## Fields

| field | notes |
|---|---|
| `id`, `class` | `meal` / `product` / `label` |
| `image` | path relative to this folder |
| `calories`, `protein_g`, `carbs_g`, `fat_g` | the ground truth, on `basis` |
| `basis` | `per_serving` / `per_100g` / `per_100ml` — **always check** |
| `serving_desc`, `serving_size_g` | portion name and gram weight; either may be null |
| `label_tier` | `panel` = printed on a nutrition panel; `publisher` = official values from the brand/site |
| `verification` | `{verdict, reason, details}` — verdict is `pass` or `suspect` |
| `is_clean` | `true` iff verdict is `pass` |
| `corrected` | `true` on 6 rows whose source data was wrong and was fixed from the panel |
| `atwater_deviation_pct` | how far `4P + 4C + 9F` sits from stated calories |
| `sha256`, `bytes`, `width`, `height`, `format` | for integrity and dedupe when merging |
| `source_url`, `image_url`, `license`, `barcode`, `region`, `notes` | provenance |

Every row has every field; absent values are `null`, never missing.

## Provenance

Every row's macros come from the **same page or response as its photo**. Nothing is estimated,
inferred from a similar dish, or model-generated. Sources: Open Food Facts (products and labels),
Sweetgreen, Starbucks, Chick-fil-A, Au Bon Pain, BBC Good Food, Budget Bytes, Well Plated.

All 50 rows were independently verified by opening the image and comparing it against the recorded
values. That pass found real errors — 4 label rows had per-serving values stored in per-100g fields
(2× and 2.08× off), which no self-consistency check can detect, since a uniform scaling error keeps
`4P + 4C + 9F` consistent with the stated calories. Those were corrected from their panels or dropped.

## Licensing

Open Food Facts images are CC-BY-SA 3.0, data ODbL — redistributable with attribution. Rows marked
`proprietary-*` are third-party editorial or marketing assets, collected only from sources whose
robots.txt permits agent access. Fine for local evaluation; check each publisher's terms before
redistributing publicly. The three `bbcgoodfood.com` rows come from a site that permits crawling but
signals `ai-train=no` — consistent with evaluation use, not with training.

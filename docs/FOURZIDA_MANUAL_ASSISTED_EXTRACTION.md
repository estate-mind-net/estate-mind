# 4zida Manual-Assisted Extraction

## What This Is

When a user imports a listing URL from `4zida.rs`, the manual completion page shows a helper panel that allows the user to paste visible listing text and extract structured fields locally.

## What This Is NOT

- **NOT scraping**: We do not make HTTP requests to 4zida.rs
- **NOT automation**: The user manually copies and pastes text they can already see in their browser
- **NOT AI**: No language models or external APIs are called
- **NOT browser automation**: No headless browsers, no DOM parsing, no extension injection

The user copies text from their browser and pastes it into EstateMind. The parser runs entirely in the browser, on the user's machine.

## Flow

```
User imports 4zida.rs URL
        ↓
RentImportUrlPage creates raw_opportunity
        ↓
/manual-completion/:rawId page loads
        ↓
URL domain detected as 4zida.rs
        ↓
FourZidaPasteHelper panel appears
        ↓
User clicks "Paste listing text from 4zida to auto-fill fields"
        ↓
Textarea expands — user pastes visible listing text
        ↓
User clicks "Extract Fields"
        ↓
parse4zidaRentalText() runs locally in browser
        ↓
Results shown: confidence, extracted fields, warnings
        ↓
User clicks "Apply to Form"
        ↓
Form fields auto-filled (user can still edit)
        ↓
User proceeds with Save & Match / Save to Rent as normal
```

## Parser Behavior

### Conservative Extraction

The parser only extracts fields that are **clearly present** in the text. If a value is ambiguous or not found, it remains `null`/`undefined`. The parser never invents facts.

### Confidence Score

The confidence score (0–100%) reflects how many fields were successfully extracted out of the total possible fields. A higher score means more data was found in the text.

| Range | Meaning |
|---|---|
| 60–100% | Good extraction — most fields found |
| 30–59% | Partial extraction — some fields missing |
| 0–29% | Poor extraction — text may not be a listing |

### Fields Supported

| Field | Serbian Terms | English Terms |
|---|---|---|
| Monthly Rent | `€`, `EUR`, `evra`, `mesečno`, `kirija` | `€`, `EUR`, `monthly` |
| Size (m²) | `m2`, `m²`, `kvadrata` | `m2`, `m²`, `sqm` |
| Bedrooms | `garsonjera`, `jednoiposoban`, `dvosoban`, `trosoban`, `soba` | `studio`, `bedroom` |
| City | `Novi Sad`, `Beograd`, `Niš`, etc. | — |
| District | `Liman`, `Grbavica`, `Detelinara`, `Vračar`, etc. | — |
| Floor | `sprat`, `prizemlje`, `potkrovlje` | `floor`, `ground floor`, `attic` |
| Furnished | `namešten`, `namesten` | `furnished`, `unfurnished` |
| Parking | `parking`, `garaža` | `parking` |
| Balcony | `terasa`, `balkon`, `lođa` | `balcony`, `terrace` |
| Elevator | `lift` | `elevator` |
| Pets | `ljubimci`, `kućni ljubimci` | `pet friendly`, `pets allowed` |

### Warnings

The parser generates warnings for:
- Rent below 100 or above 3000 EUR (unusual values)
- Size below 10 m² (unusually small)
- Ambiguous amenity terms (e.g., both positive and negative terms found)

## UI Behavior

1. **Collapsed state**: Shows a clickable link "Paste listing text from 4zida to auto-fill fields"
2. **Expanded state**: Shows textarea + Extract button
3. **After extraction**: Shows confidence badge, extracted field badges, warnings, and Apply button
4. **After applying**: Toast "Fields applied from 4zida text." and form fields updated

The helper panel only appears when the raw opportunity's `source_url` contains `4zida.rs`.

## Storage

- Pasted text is NOT saved permanently
- Only a preview (max 300 chars) is stored in `raw_payload.parserInputPreview` if needed for debugging

## Limitations

1. **User must copy text manually**: No automatic extraction from URLs
2. **Text quality varies**: Different 4zida listing layouts may produce different results
3. **Serbian language focus**: Parser is optimized for Serbian rental listings; English support is basic
4. **No image parsing**: Only text fields are extracted
5. **No duplicate detection**: Parser doesn't check if the listing already exists

## Files

| File | Purpose |
|---|---|
| `src/modules/rent/hunter/services/portalHelpers/fourZidaTextParser.ts` | Core parser logic |
| `src/modules/rent/hunter/components/FourZidaPasteHelper.tsx` | UI component for paste & extract |

## Future AI-Assisted Extraction Path

When ready to add AI-assisted extraction:

1. Keep the same UI pattern (paste text → extract → review → apply)
2. Add an optional "AI Extract" button alongside "Extract Fields"
3. Send the pasted text to an LLM for structured extraction
4. Show AI results separately with clear labeling
5. User reviews and confirms before applying
6. Store AI extraction confidence separately from rule-based confidence

Key constraints:
- User must explicitly opt-in to AI extraction
- AI results must be shown for review before applying
- Rule-based extraction remains the default (no API calls needed)
- Both extraction methods can coexist in the same UI
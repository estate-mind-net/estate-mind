# Scoring Semantics

## Scoring Philosophy

`score` represents estimated investment attractiveness, not certainty. A low score means the asset appears unattractive on the facts and assumptions available. A mid-range score means the opportunity may be viable but needs more diligence. A high score means the opportunity appears attractive on a risk-adjusted basis.

`score = 0` is reserved for cases where the investment itself appears extremely poor, such as severe legal impairment, structurally unviable condition, no realistic rentability, or similarly explicit negative evidence.

## Confidence Philosophy

`confidenceLevel` represents how certain the analysis is.

- High confidence means the available information is relatively complete and internally consistent.
- Medium confidence means some assumptions are material but bounded.
- Low confidence means important information is missing, weakly verified, or heavily assumption-driven.

Confidence should move independently from investment quality. A low-confidence opportunity can still have moderate or strong estimated attractiveness. Likewise, a high-confidence opportunity can still be poor.

## Handling Missing Data

When data is incomplete, the analyzer should:

- estimate investment attractiveness from the available facts and conservative assumptions
- lower confidence
- enumerate missing information
- explain which assumptions were required
- avoid fabricated precision where evidence is absent

The normalization layer also protects this distinction. If the provider returns `score.overall = 0` together with `confidenceLevel = low` and significant missing information, the server treats that combination as an uncertainty signal rather than a true zero-quality verdict, unless the response explicitly explains a severe investment defect.

## Why Uncertainty Must Not Equal Zero

Zero conflates two different concepts:

- investment quality: how attractive the asset appears
- uncertainty: how incomplete or unreliable the available evidence is

If uncertainty is encoded as zero, the UI communicates that the deal itself is terrible when the actual problem is incomplete diligence. That produces misleading recommendations, undermines investor trust, and makes missing data indistinguishable from truly poor opportunities.

The correct behavior is:

- keep score focused on estimated attractiveness
- use confidence and missing-information sections to express uncertainty
- reserve near-zero scores for explicitly poor investments
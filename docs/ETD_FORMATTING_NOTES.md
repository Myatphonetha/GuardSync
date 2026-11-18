# USF ETD rules used for the GuardSync thesis draft

Source documents (Spring 2026):

- `ETD Downloadable Template with Automatic TOC, Styles, and Comments SP 26.docx`
- `ETD CHECKLIST REFRESH SP 26 - Live on Web.docx`

The generated manuscript is `docs/thesis/GuardSync_ETD_draft.docx` (rebuild with `python docs/thesis/build_etd.py`).

## Front matter order

1. Title page (centered, single-spaced, no page number)
2. Dedication (optional, not in TOC, no page number)
3. Acknowledgments (optional, not in TOC)
4. Table of Contents (lowercase Roman page numbers start here)
5. List of Tables
6. List of Figures
7. List of Abbreviations
8. Abstract (mandatory)

Then Chapter One…, References, appendices, optional About the Author (no page number).

## Title page

- Title Case; at most two lines; if two lines, leave one blank line between them
- Degree line, department, college, University of South Florida
- `Major Professor: Name, Ph.D.` only (no Dr. or Member: prefixes)
- Date of Approval: Month Day, Year (defense date)
- Keywords: 4–6 terms **not already in the title**
- Copyright line

## Abstract

- One paragraph, double-spaced, about 250–350 words
- **No keywords** on this page (they belong only on the title page)

## Body formatting (checklist)

- 1 inch margins on 8.5 by 11 inch paper
- One typeface and one size (Times New Roman 12 pt here); captions/tables may go down to 8 pt
- One font color
- Double-space Dedication, Acknowledgments, and body
- Single-space title page, TOC, lists, abbreviations
- Left-aligned body (not mixed with full justify)
- **No running head** (USF overrides APA on this point)
- Level 1 headings start on a **new page**, flush with the top margin
- Each heading level styled one way only; TOC entries are Title Case without bold, italics, or ALL CAPS
- Tables: caption **above**; notes below; continued tables need `Table #. Continued.`
- Figures: caption **below** in this draft; figure and caption stay on **one page**
- Numbering Option B: Table 3.1, Figure 3.1, …
- Appendix extras: Table A1, Table A2, …

## Page numbers (set in Word after generation)

| Pages | Numbers |
|-------|---------|
| Title, Dedication, Acknowledgments | None |
| TOC through Abstract | i, ii, iii… |
| Chapters, References, Appendices | 1, 2, 3… |
| About the Author | None |

Place numbers 0.5–0.75 inch from the bottom, same font as the body, consistent left or center.

## Required appendices in this draft

- Appendix A: generative AI disclosure (committee permission, model, version, purpose)
- Appendix B: assistive AI disclosure
- Appendix C: copyright permissions / fair-use worksheets
- Appendix D: supplementary technical listings

Add IRB/IACUC letters if human or animal research applies.

## Word steps after opening the .docx

1. Update the Table of Contents field
2. Insert caption-based List of Tables and List of Figures if you add more graphics
3. Apply section breaks for Roman vs Arabic page numbers (unlink headers/footers)
4. Confirm no content in the 1 inch margins
5. Export PDF with bookmarks and searchable text (ADA Title II items on the checklist)

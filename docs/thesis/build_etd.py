"""
Build a USF ETD-styled Word draft. This restart opens with the user-interface pipeline.

Follows:
- ETD Downloadable Template (SP 26): title page, front matter, chapters, references, AI appendices
- ETD Checklist Refresh (SP 26): 1" margins, one font, spacing, heading/page-number rules

After opening the .docx in Word: update the Table of Contents field (References > Update Table),
set section page numbers (Roman in front matter, Arabic from Chapter One), and confirm
Times New Roman 12 pt throughout.
"""

from __future__ import annotations

from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, Twips


OUT = Path(__file__).resolve().parent / "GuardSync_ETD_draft.docx"
FONT = "Times New Roman"
SIZE = Pt(12)


def set_run_font(run, *, bold=False, italic=False, size=SIZE):
    run.font.name = FONT
    run.font.size = size
    run.bold = bold
    run.italic = italic
    r = run._element
    rPr = r.get_or_add_rPr()
    rFonts = rPr.get_or_add_rFonts()
    rFonts.set(qn("w:ascii"), FONT)
    rFonts.set(qn("w:hAnsi"), FONT)
    rFonts.set(qn("w:cs"), FONT)


def set_paragraph_format(p, *, double=True, first_line=False, space_after=0, space_before=0, center=False, left=False):
    pf = p.paragraph_format
    pf.space_after = Pt(space_after)
    pf.space_before = Pt(space_before)
    pf.widow_control = True
    if double:
        pf.line_spacing_rule = WD_LINE_SPACING.DOUBLE
    else:
        pf.line_spacing_rule = WD_LINE_SPACING.SINGLE
        pf.line_spacing = 1.0
    pf.first_line_indent = Inches(0.5) if first_line else Inches(0)
    if center:
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    elif left:
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT


def add_text(p, text, **kwargs):
    run = p.add_run(text)
    set_run_font(run, **kwargs)
    return run


def page_break(doc):
    p = doc.add_paragraph()
    set_paragraph_format(p, double=False)
    run = p.add_run()
    run.add_break(WD_BREAK.PAGE)


def title_line(doc, text, *, blank_after=False):
    p = doc.add_paragraph()
    set_paragraph_format(p, double=False, center=True, space_after=0, space_before=0)
    add_text(p, text)
    if blank_after:
        empty = doc.add_paragraph()
        set_paragraph_format(empty, double=False, center=True)


def heading1(doc, text):
    """Level 1: new page, flush with top, Title Case, bold, 12 pt."""
    page_break(doc)
    p = doc.add_paragraph()
    p.style = doc.styles["Heading 1"]
    set_paragraph_format(p, double=True, first_line=False, space_after=12, space_before=0)
    p.clear()
    add_text(p, text, bold=True)
    return p


def heading2(doc, text):
    p = doc.add_paragraph()
    p.style = doc.styles["Heading 2"]
    set_paragraph_format(p, double=True, first_line=False, space_before=12, space_after=6)
    p.clear()
    add_text(p, text, bold=True)
    return p


def heading3(doc, text):
    p = doc.add_paragraph()
    p.style = doc.styles["Heading 3"]
    set_paragraph_format(p, double=True, first_line=False, space_before=6, space_after=6)
    p.clear()
    add_text(p, text, italic=True)
    return p


def body(doc, text, *, first_line=True):
    p = doc.add_paragraph()
    set_paragraph_format(p, double=True, first_line=first_line, left=True)
    add_text(p, text)
    return p


def caption_table(doc, text):
    """Table captions go above the table (ETD checklist)."""
    p = doc.add_paragraph()
    set_paragraph_format(p, double=True, first_line=False, space_before=12, space_after=6)
    add_text(p, text)


def caption_figure(doc, text):
    """Figure captions go below the figure; figure + caption stay on one page."""
    p = doc.add_paragraph()
    set_paragraph_format(p, double=True, first_line=False, space_before=6, space_after=12)
    add_text(p, text)
    return p


def add_table(doc, headers, rows):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = "Table Grid"
    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = ""
        p = cell.paragraphs[0]
        set_paragraph_format(p, double=False, first_line=False)
        add_text(p, h, bold=True, size=Pt(11))
    for r_i, row in enumerate(rows):
        for c_i, val in enumerate(row):
            cell = table.rows[r_i + 1].cells[c_i]
            cell.text = ""
            p = cell.paragraphs[0]
            set_paragraph_format(p, double=False, first_line=False)
            add_text(p, val, size=Pt(11))
    return table


def hanging_ref(doc, text):
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.line_spacing_rule = WD_LINE_SPACING.DOUBLE
    pf.left_indent = Inches(0.5)
    pf.first_line_indent = Inches(-0.5)
    pf.space_after = Pt(0)
    pf.keep_together = True
    add_text(p, text)


def add_toc_field(doc):
    p = doc.add_paragraph()
    set_paragraph_format(p, double=False, first_line=False)
    run = p.add_run()
    set_run_font(run)
    fld = OxmlElement("w:fldChar")
    fld.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = r'TOC \o "1-3" \h \z \u'
    sep = OxmlElement("w:fldChar")
    sep.set(qn("w:fldCharType"), "separate")
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    run._r.append(fld)
    run._r.append(instr)
    run._r.append(sep)
    hint = p.add_run("Right-click and choose Update Field in Word to populate this Table of Contents.")
    set_run_font(hint, italic=True)
    run2 = p.add_run()
    run2._r.append(end)


def configure_styles(doc):
    normal = doc.styles["Normal"]
    normal.font.name = FONT
    normal.font.size = SIZE
    normal.font.color.rgb = None
    pf = normal.paragraph_format
    pf.line_spacing_rule = WD_LINE_SPACING.DOUBLE
    for name, bold, italic in (("Heading 1", True, False), ("Heading 2", True, False), ("Heading 3", False, True)):
        st = doc.styles[name]
        st.font.name = FONT
        st.font.size = SIZE
        st.font.bold = bold
        st.font.italic = italic
        st.font.color.rgb = None
        st.paragraph_format.page_break_before = name == "Heading 1"


def configure_section(doc):
    section = doc.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.left_margin = Inches(1)
    section.right_margin = Inches(1)
    section.top_margin = Inches(1)
    section.bottom_margin = Inches(1)
    section.header_distance = Inches(0.5)
    section.footer_distance = Inches(0.6)
    # No running head (ETD checklist).
    header = section.header
    header.is_linked_to_previous = False
    for p in header.paragraphs:
        p.text = ""


def pipeline_figure(path: Path):
    """Printable pipeline of the athlete stream. Text lives in the caption and the prose."""
    from PIL import Image, ImageDraw, ImageFont

    path.parent.mkdir(parents=True, exist_ok=True)
    stages = [
        ("1", "Holder board", "nRF52840 on the Particle Argon sends one text line"),
        ("2", "Bluetooth notify", "Nordic UART transmit characteristic. The phone does not send commands"),
        ("3", "Decode and parse", "Base64 becomes text. A bad line is dropped"),
        ("4", "Dashboard", "Cards update on every line that parses"),
        ("5", "Save every 2 seconds", "Snapshot and outbox on the phone. Confirmed mode is attached"),
        ("6", "Cloud insert", "Only when a user is signed in. The phone copy stays if the insert fails"),
        ("7", "History", "Phone rows and cloud rows become one timeline"),
    ]
    width = 2200
    box_h = 150
    gap = 36
    margin_x = 70
    margin_y = 50
    height = margin_y * 2 + len(stages) * box_h + (len(stages) - 1) * gap
    image = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(image)
    regular = ImageFont.truetype(r"C:\Windows\Fonts\calibri.ttf", 42)
    bold = ImageFont.truetype(r"C:\Windows\Fonts\calibrib.ttf", 48)
    small = ImageFont.truetype(r"C:\Windows\Fonts\calibrib.ttf", 36)
    green = (0, 103, 71)
    ink = (28, 28, 28)
    card = (238, 243, 239)
    y = margin_y
    box_w = width - margin_x * 2
    for i, (num, title, detail) in enumerate(stages):
        draw.rounded_rectangle((margin_x, y, margin_x + box_w, y + box_h), radius=18, fill=card, outline=green, width=4)
        circle_x = margin_x + 28
        draw.ellipse((circle_x, y + 38, circle_x + 74, y + 112), fill=green)
        num_box = draw.textbbox((0, 0), num, font=bold)
        draw.text(
            (circle_x + (74 - (num_box[2] - num_box[0])) / 2, y + 50),
            num,
            font=bold,
            fill="white",
        )
        draw.text((margin_x + 130, y + 28), title, font=bold, fill=green)
        draw.text((margin_x + 130, y + 86), detail, font=regular, fill=ink)
        y += box_h
        if i < len(stages) - 1:
            mid = margin_x + box_w / 2
            draw.line((mid, y, mid, y + gap - 8), fill=green, width=6)
            draw.polygon([(mid - 12, y + gap - 16), (mid + 12, y + gap - 16), (mid, y + gap - 2)], fill=green)
            y += gap
    image.save(path, "PNG")
    return path


def add_picture(doc, path, width_in):
    p = doc.add_paragraph()
    set_paragraph_format(p, double=False, first_line=False, center=True, space_before=6, space_after=0)
    p.paragraph_format.keep_together = True
    p.paragraph_format.keep_with_next = True
    run = p.add_run()
    set_run_font(run)
    run.add_picture(str(path), width=Inches(width_in))
    return p


def figure_lines(doc, lines):
    for line in lines:
        p = doc.add_paragraph()
        set_paragraph_format(p, double=False, first_line=False, left=True, space_after=0)
        add_text(p, line, size=Pt(11))


def note(doc, text):
    p = doc.add_paragraph()
    set_paragraph_format(p, double=True, first_line=False, space_before=6)
    add_text(p, text, italic=True)


def code_listing(doc, lines):
    """Single-spaced source listing. Text, not an image, so the PDF stays searchable."""
    table = doc.add_table(rows=1, cols=1)
    table.style = "Table Grid"
    cell = table.cell(0, 0)
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), "F3F3F3")
    tcPr.append(shd)
    for i, line in enumerate(lines):
        p = cell.paragraphs[0] if i == 0 else cell.add_paragraph()
        set_paragraph_format(p, double=False, first_line=False, left=True, space_after=0, space_before=0)
        add_text(p, line if line else " ", size=Pt(9))
    return table



FIG = Path(__file__).resolve().parent / "figures"


def add_phone_figure(doc, filename, caption):
    """One phone photograph and its caption, sized to stay on a single page."""
    path = FIG / filename
    with Image_open(path) as im:
        pixel_w, pixel_h = im.size
    width = 5.35 * (pixel_w / pixel_h)
    if width > 3.15:
        width = 3.15
    add_picture(doc, path, width)
    cap = caption_figure(doc, caption)
    cap.paragraph_format.keep_together = True
    return cap


def Image_open(path):
    from PIL import Image

    return Image.open(path)


ABSTRACT = (
    "GuardSync is the phone companion for a teaching prototype of a sensor-embedded athletic mouthguard. "
    "This thesis begins with the interface, because that is the path a person follows before "
    "any sample is stored. After sign-in the user chooses Athlete, Parent or Guardian, or Trainer or Coach. "
    "The athlete path continues through a profile placeholder, device pairing, a calibration sequence that "
    "advances labels without writing a baseline, and a required choice of Training, Game, or Sleep. The live "
    "dashboard then shows the latest sample from the holder board: head acceleration, a display band titled "
    "Concussion Risk, bite force, heart rate, oxygen saturation, and body temperature. Card order follows the "
    "confirmed activity. Colors mark interface zones chosen in the client. The risk band is a cut on the "
    "relative head-acceleration integer, at 90 and at 120. Clinical recognition of concussion remains a "
    "medical judgment [3]. If recent samples disagree with the confirmed activity, "
    "the dashboard and the history screen ask before the label changes and before recent phone rows are "
    "relabeled. History draws the measurements on one timeline, with a one-, three-, or five-minute window, "
    "an activity strip, and a count of points the charts treat as critical. The parent screen and the trainer "
    "roster in the accompanying figures are simulated views. They do not read the Bluetooth stream. The figures "
    "in Chapter Two are photographs of these screens on an Android development build. "
    "The line format, storage, and a bench evaluation remain future work. The contribution of this thesis is a traceable "
    "account of the interface pipeline, tied to the screens and to the client that draws them."
)


def build():
    doc = Document()
    configure_styles(doc)
    configure_section(doc)

    title_line(doc, "An End-to-End Companion Application for a")
    empty = doc.add_paragraph()
    set_paragraph_format(empty, double=False, center=True)
    title_line(doc, "Sensor-Embedded Athletic Mouthguard")
    empty = doc.add_paragraph()
    set_paragraph_format(empty, double=False, center=True)
    title_line(doc, "by")
    empty = doc.add_paragraph()
    set_paragraph_format(empty, double=False, center=True)
    title_line(doc, "Myat Phone Tha")
    empty = doc.add_paragraph()
    set_paragraph_format(empty, double=False, center=True)
    title_line(doc, "A thesis submitted in partial fulfillment")
    title_line(doc, "of the requirements for the degree of")
    title_line(doc, "Bachelor of Science in Computer Science")
    empty = doc.add_paragraph()
    set_paragraph_format(empty, double=False, center=True)
    title_line(doc, "Department of Computer Science and Engineering")
    title_line(doc, "College of Engineering")
    title_line(doc, "University of South Florida")
    empty = doc.add_paragraph()
    set_paragraph_format(empty, double=False, center=True)
    title_line(doc, "Major Professor: [Name], Ph.D.")
    title_line(doc, "[Committee Member], Ph.D.")
    title_line(doc, "[Committee Member], Ph.D.")
    empty = doc.add_paragraph()
    set_paragraph_format(empty, double=False, center=True)
    title_line(doc, "Date of Approval:")
    title_line(doc, "[Defense date]")
    empty = doc.add_paragraph()
    set_paragraph_format(empty, double=False, center=True)
    title_line(
        doc,
        "Keywords: mobile interface, activity labeling, Bluetooth Low Energy, wearable telemetry, sideline display",
    )
    empty = doc.add_paragraph()
    set_paragraph_format(empty, double=False, center=True)
    title_line(doc, "Copyright © 2026, Myat Phone Tha")

    page_break(doc)
    p = doc.add_paragraph()
    set_paragraph_format(p, double=True, first_line=False, center=True)
    add_text(p, "Dedication", bold=True)
    p = doc.add_paragraph()
    set_paragraph_format(p, double=True, first_line=False, center=True)
    add_text(p, "To the athletes, trainers, and families who inspired this work.")

    page_break(doc)
    p = doc.add_paragraph()
    set_paragraph_format(p, double=True, first_line=False)
    add_text(p, "Acknowledgments", bold=True)
    body(
        doc,
        "I thank my major professor and committee for their review of this undergraduate thesis. Their names "
        "belong on the title page before the manuscript is submitted. I also thank the people who discussed "
        "the mouthguard hardware and the mobile interface while the software was being written. This opening "
        "follows the GuardSync screens as they appear on an Android development build, including paths that "
        "are still placeholders and views that still use simulated people. Responsibility for that account, "
        "and for any error in it, is mine.",
    )

    page_break(doc)
    p = doc.add_paragraph()
    set_paragraph_format(p, double=False, first_line=False)
    add_text(p, "Table of Contents", bold=True)
    add_toc_field(doc)

    page_break(doc)
    p = doc.add_paragraph()
    set_paragraph_format(p, double=False, first_line=False)
    add_text(p, "List of Tables", bold=True)
    for line in (
        "Table 2.1  Screens in the interface pipeline",
        "Table 2.2  Athlete dashboard color zones",
        "Table 2.3  Metric card order by activity mode",
        "Table 2.4  History chart marks treated as critical",
        "Table 2.5  Which photographed screens read a live stream",
    ):
        p = doc.add_paragraph()
        set_paragraph_format(p, double=False, first_line=False, space_after=6)
        add_text(p, line)

    page_break(doc)
    p = doc.add_paragraph()
    set_paragraph_format(p, double=False, first_line=False)
    add_text(p, "List of Figures", bold=True)
    for line in (
        "Figure 2.1  Role selection",
        "Figure 2.2  Athlete profile setup",
        "Figure 2.3  Activity selection after the holder board is connected",
        "Figure 2.4  Athlete dashboard during a game session",
        "Figure 2.5  The same dashboard when readings enter warning and danger zones",
        "Figure 2.6  Mode-change prompt on the athlete dashboard",
        "Figure 2.7  Performance history with the activity strip and a mode prompt",
        "Figure 2.8  History charts for heart rate and blood oxygen",
        "Figure 2.9  History charts for blood oxygen and body temperature",
        "Figure 2.10  Parent read-only view of one athlete",
        "Figure 2.11  Trainer roster for a simulated team",
        "Figure 2.12  Trainer detail sheet for one athlete",
    ):
        p = doc.add_paragraph()
        set_paragraph_format(p, double=False, first_line=False, space_after=6)
        add_text(p, line)

    page_break(doc)
    p = doc.add_paragraph()
    set_paragraph_format(p, double=False, first_line=False)
    add_text(p, "List of Abbreviations", bold=True)
    for ab, de in (
        ("BLE", "Bluetooth Low Energy"),
        ("BPM", "Beats per Minute"),
        ("NUS", "Nordic UART Service"),
        ("SpO2", "Peripheral Oxygen Saturation"),
        ("UART", "Universal Asynchronous Receiver-Transmitter"),
    ):
        p = doc.add_paragraph()
        set_paragraph_format(p, double=False, first_line=False)
        add_text(p, f"{ab}\t{de}")

    page_break(doc)
    p = doc.add_paragraph()
    set_paragraph_format(p, double=True, first_line=False)
    add_text(p, "Abstract", bold=True)
    body(doc, ABSTRACT, first_line=True)

    heading1(doc, "Chapter One: Introduction")
    heading2(doc, "Why the Interface Comes First")
    body(
        doc,
        "Contact sports produce short head impacts that a person on the sideline can miss. Clinical "
        "recognition and management of concussion remain a medical process [3]. Instrumented mouthguards "
        "have been built as research devices that estimate head kinematics from sensors held by the upper "
        "teeth [1], [2]. A reading still has to reach a person. GuardSync is the phone layer for a teaching "
        "prototype of that wearable. The board on the bench is a Particle Argon holder for a Nordic nRF52840, "
        "the chip planned for the mouthguard [4]. The phone discovers that holder, shows the latest sample, and "
        "keeps an activity label the athlete confirms.",
    )
    body(
        doc,
        "The manuscript is organized so that a reader meets the screens before the packet format. The "
        "photographs make visible which numbers are live, which labels the athlete chose, and which rosters "
        "are still simulated. Chapter Two walks through photographs of the Android development build in the "
        "order a person meets them [5]. Chapter Three states what each photograph is connected to in the "
        "client, so a simulated roster stays distinct from a sideline deployment.",
    )
    heading2(doc, "Problem Statement")
    body(
        doc,
        "The interface has to do four things at once. It has to separate the athlete who wears the mouthguard "
        "from a parent and from a trainer. It has to make the athlete choose Training, Game, or Sleep, because "
        "a later analyst should inherit that choice and not a silent guess. It has to show the latest sample "
        "in zones a person can read quickly, without speaking as if a color were a medical finding. And it "
        "has to ask before it changes the activity label. This opening specifies those screens for GuardSync "
        "version 1.0.0. It does not certify a medical device, and it does not report a headform study.",
    )
    heading2(doc, "Objectives of This Opening")
    body(
        doc,
        "The first objective is to document the three role paths as they are implemented. The second is to "
        "document the athlete sequence from profile setup through activity selection, the live dashboard, "
        "and history. The third is to record the color zones, the card order, and the confirm-before-switch "
        "prompt that the photographs show. The fourth is to mark which of those photographs read the holder "
        "board and which are fixed or randomly updated stand-ins. A supervised impact classifier, a packet "
        "delivery rate, and a finished parent link are outside this opening.",
    )
    heading2(doc, "Organization")
    body(
        doc,
        "Chapter Two is the pipeline. Each major screen in the photograph set appears once, with the route "
        "that draws it and the action that leaves it. Chapter Three relates those screens to Bluetooth, "
        "local storage, and the cloud, and it lists the screens that were not photographed. The references "
        "and the required disclosures follow. Chapters on the line format, the insert payload, and a bench "
        "evaluation are the next writing, not part of this file.",
    )

    heading1(doc, "Chapter Two: User Interface Pipeline")
    heading2(doc, "How the Screens Fit Together")
    body(
        doc,
        "GuardSync is an Expo Router application. A file under app/ is a route. Sign-in lives at the root. "
        "A stored session sends the user to role selection. From there the pipeline splits. The athlete "
        "continues to a profile placeholder, then to pairing, calibration, activity selection, the dashboard, "
        "and history. The parent and the trainer each have a profile placeholder and then a dashboard of "
        "their own. Figure 2.1 through Figure 2.12 are photographs of that build. Each photograph includes "
        "the Android status bar and the system navigation bar. The application content is the region between "
        "them. Table 2.1 names the route for every step, including the two athlete steps that sit between "
        "the profile photograph and the activity photograph and were not part of this set.",
    )
    caption_table(doc, "Table 2.1. Screens in the interface pipeline.")
    add_table(
        doc,
        ["Order", "Who", "Screen", "Route", "In the figures"],
        [
            ["1", "All", "Choose a role", "/role", "Figure 2.1"],
            ["2", "Athlete", "Profile setup", "/profile", "Figure 2.2"],
            ["3", "Athlete", "Device pairing", "/onboarding", "Described in prose"],
            ["4", "Athlete", "Calibration", "/calibration-flow", "Described in prose"],
            ["5", "Athlete", "Choose an activity", "/usage-mode", "Figure 2.3"],
            ["6", "Athlete", "Live dashboard", "/dashboard", "Figures 2.4 to 2.6"],
            ["7", "Athlete", "History", "/history", "Figures 2.7 to 2.9"],
            ["8", "Parent", "Read-only athlete view", "/parent-dashboard", "Figure 2.10"],
            ["9", "Trainer", "Team roster and sheet", "/trainer-dashboard", "Figures 2.11 and 2.12"],
        ],
    )
    note(
        doc,
        "Note. Parent and trainer profile, linking, and invite routes exist as placeholders and are not photographed here.",
    )

    heading2(doc, "Choosing a Role")
    body(
        doc,
        "Role selection is the fork. The screen title is Choose Your Role, and the subtitle asks how the "
        "person will use GuardSync. Three cards are offered. Athlete is for tracking one's own performance "
        "and health metrics. Parent or Guardian is for monitoring a child's safety and health data remotely. "
        "Trainer or Coach is for overseeing a team's stats, managing athletes, and reviewing risks. A card "
        "must be selected before Continue is enabled. Athlete continues to profile setup. Parent continues "
        "to the parent profile. Trainer continues to the trainer profile. The back control returns to sign-in. "
        "Figure 2.1 shows the screen before a card is selected, with Continue still unavailable.",
    )
    add_phone_figure(
        doc,
        "ui-role.png",
        "Figure 2.1. Role selection. Continue stays unavailable until Athlete, Parent or Guardian, or Trainer or Coach is selected.",
    )

    heading2(doc, "Athlete Profile")
    body(
        doc,
        "The athlete profile screen is a placeholder. Its title is Profile setup. The subtitle states that "
        "the fields are meant to mirror a web profile screen, and those fields are not on this screen yet. "
        "The name, sex, weight, and height shown later on the dashboard are literals in the dashboard "
        "component, not values collected here. Two actions are available. Back leaves the screen. Continue "
        "to device pairing opens onboarding. A short note at the bottom says that calls and notifications "
        "will vibrate. Figure 2.2 is that screen.",
    )
    add_phone_figure(
        doc,
        "ui-profile.png",
        "Figure 2.2. Athlete profile setup. The screen collects no profile fields. Continue opens device pairing.",
    )
    body(
        doc,
        "Onboarding scans for the Nordic UART Service, or it can save a demonstration sample when the holder "
        "board is not advertising. After one sample is stored, calibration shows five labels in order: Intro, "
        "Bite force, Resting jaw, Baseline vitals, and Done. Next advances the label. Finish replaces the "
        "route with activity selection. No baseline measurement is written. Those two screens are part of "
        "the pipeline and are not in the photograph set.",
    )

    heading2(doc, "Choosing the Session Activity")
    body(
        doc,
        "Activity selection is the last step before the dashboard. The title asks what the athlete is doing "
        "today. The subtitle states that the Argon is connected and that, after calibration, an activity "
        "should be picked so that metrics and alerts match the session. Three choices are shown. Training "
        "is described as practice and drills, with attention to effort and intensity. Game is described as "
        "competition, with attention to impact and concussion risk. Sleep is described as rest and recovery, "
        "with attention to vitals overnight. Continue to dashboard stores the choice as a manual selection, "
        "starts a session identifier, and replaces the route with the dashboard. Figure 2.3 shows the three "
        "choices before one is selected.",
    )
    add_phone_figure(
        doc,
        "ui-activity.png",
        "Figure 2.3. Activity selection after the holder board is connected. The athlete chooses Training, Game, or Sleep for the session.",
    )
    body(
        doc,
        "The stored label is the one later rows carry as the confirmed mode. A detector may disagree. It "
        "does not replace the label on its own. The dashboard and the history screen are where that "
        "disagreement is shown.",
    )

    heading2(doc, "Athlete Dashboard")
    body(
        doc,
        "The dashboard is the sideline view for the athlete. The header shows a stand-in name, John Smith, "
        "and a Bluetooth mark. A status card reports Connected when a device identifier is stored, together "
        "with the fixed profile lines Sex: Male, Weight: 247 lbs, and Height: 6' 2\". Under Activity, a "
        "segmented control repeats Training, Game, and Sleep. The hint under that control says the mode "
        "is set after calibration when the Argon is paired, and that the athlete will be asked on this "
        "screen if live stats suggest a different activity. The athlete can also change the mode by pressing "
        "a segment. The bottom bar moves between Dashboard and History.",
    )
    body(
        doc,
        "Figure 2.4 is a game session with ordinary readings. Game is the selected segment, so the first "
        "cards are head acceleration and the risk band. The photograph shows 66g and Low. The next row "
        "shows bite force at 111 N and heart rate at 81 BPM. SpO2, body temperature, and the sport card "
        "sit below the fold on this layout. The sport card is the constant Football.",
    )
    add_phone_figure(
        doc,
        "ui-dashboard-game.png",
        "Figure 2.4. Athlete dashboard during a game session. Head acceleration is 66g and the display band reads Low.",
    )
    body(
        doc,
        "Figure 2.5 is the same screen scrolled to a session whose readings have entered the warning and "
        "danger colors. Head acceleration reads 149g and the risk band reads High. Bite force reads 240 N "
        "in the warning color. Heart rate reads 177 BPM in the warning color. SpO2 reads 89 percent in the "
        "danger color. Body temperature reads 99.7 F in the warning color. Table 2.2 is the rule behind "
        "those colors. Table 2.3 is the card order. The cuts are interface choices. For head acceleration "
        "and bite force they are applied to the relative integers the parser stored, and the g and N suffixes "
        "are labels on those integers. The risk band is the display named Concussion Risk. It is a cut at "
        "90 and at 120. It is a reading aid on this screen. Clinical recognition of concussion remains the "
        "process described in the Berlin consensus statement [3].",
    )
    add_phone_figure(
        doc,
        "ui-dashboard-elevated.png",
        "Figure 2.5. The game dashboard when readings enter warning and danger zones. Head acceleration is 149g and the display band reads High.",
    )
    caption_table(doc, "Table 2.2. Athlete dashboard color zones.")
    add_table(
        doc,
        ["Signal", "Warning color", "Danger color"],
        [
            ["Head-acceleration display band", "Relative value at least 90, labeled Moderate", "Relative value at least 120, labeled High"],
            ["Heart rate", "At least 150 BPM", "At least 190 BPM"],
            ["SpO2", "Below 95 percent", "Below 92 percent"],
            ["Body temperature", "Above 99.5 F", "Above 100.4 F"],
            ["Bite force", "Relative value at least 200, labeled N", "Relative value above 300, labeled N"],
        ],
    )
    note(doc, "Note. Below the warning cut, the card uses the default green. The risk card reads Low under 90.")
    caption_table(doc, "Table 2.3. Metric card order by activity mode.")
    add_table(
        doc,
        ["Mode", "Order of cards"],
        [
            ["Game", "Head acceleration, risk band, bite force, heart rate, SpO2, temperature, sport"],
            ["Training", "Heart rate, head acceleration, risk band, SpO2, temperature, bite force, sport"],
            ["Sleep", "Heart rate, SpO2, temperature, head acceleration, risk band, bite force, sport"],
        ],
    )

    heading2(doc, "Asking Before a Mode Change")
    body(
        doc,
        "Samples keep the activity the athlete confirmed. A deterministic detector in the client may decide "
        "that the recent window looks like a different activity. When it does, a banner is placed above the "
        "activity control. The banner does not change the mode. Figure 2.6 shows that banner on the dashboard "
        "while Training is still the selected segment. The title says that recent stats look like Game. The "
        "reason line says that repeated or high head impacts were detected, with a noticeable change in recent "
        "vitals. The hint states that the athlete is set to Training and asks whether to switch and update "
        "recent samples. Switch to Game confirms the new label, starts a new session identifier, and relabels "
        "local rows in the prompting window. Keep Training dismisses the banner and leaves the label as it was. "
        "Rows already inserted in the database are not rewritten by that confirmation. In the photograph the "
        "training card order is in effect, so heart rate at 95 BPM precedes head acceleration at 53g.",
    )
    add_phone_figure(
        doc,
        "ui-mode-prompt.png",
        "Figure 2.6. Mode-change prompt on the athlete dashboard. Training remains selected until the athlete chooses Switch to Game or Keep Training.",
    )

    heading2(doc, "History")
    body(
        doc,
        "History is the second athlete destination on the bottom bar. Its title is Performance History, and "
        "the subtitle says that the metrics below share one timeline. The athlete picks a one-, three-, or "
        "five-minute window. A badge counts points the charts treat as critical. Figure 2.7 shows that badge "
        "reading 36 Alerts for the window that was loaded when the photograph was taken. The same screen can "
        "show the mode banner. In that photograph the athlete is set to Sleep, the detector suggests Game, "
        "and the actions are Switch to Game and Keep Sleep. A line under the banner reports that 20 samples "
        "from this device were synced to the cloud. An activity strip then colors the shared timeline. Dark "
        "green is Training and orange is Game. The strip in the photograph runs from 0 s to 44 s.",
    )
    add_phone_figure(
        doc,
        "ui-history-overview.png",
        "Figure 2.7. Performance history. The window is 1 minute, the alert badge reads 36, and the activity strip marks Training and Game on one timeline.",
    )
    body(
        doc,
        "Each measurement is a bar chart with its own vertical scale, a horizontal threshold line, and a "
        "summary of average, and where the chart computes them, minimum and maximum. A bar uses the series "
        "color when the point is inside the chart's mark, and red when the point is treated as critical. "
        "Heart rate and SpO2 use green for the series color. Body temperature uses orange, which is why "
        "Figure 2.9 shows orange bars as well as red ones. Figure 2.8 is the heart-rate chart, with average "
        "135 BPM, minimum 57, and maximum 200, followed by the SpO2 chart with average 94 percent. Figure 2.9 "
        "continues the scroll at SpO2 and then body temperature. Table 2.4 is the critical rule. Those marks "
        "are independent of the dashboard colors in Table 2.2. Head acceleration is marked above 80 on the "
        "chart and above 90 on the dashboard. The two screens are two scales.",
    )
    add_phone_figure(
        doc,
        "ui-history-hr.png",
        "Figure 2.8. History charts for heart rate and blood oxygen. Red bars are points the chart treats as critical. The horizontal line is the chart threshold.",
    )
    add_phone_figure(
        doc,
        "ui-history-temp.png",
        "Figure 2.9. History charts for blood oxygen and body temperature. Temperature uses an orange series color. Red bars remain the critical mark.",
    )
    caption_table(doc, "Table 2.4. History chart marks treated as critical.")
    add_table(
        doc,
        ["Series", "Critical when"],
        [
            ["Heart rate", "Above 180 BPM or below 50 BPM"],
            ["SpO2", "Below 92 percent"],
            ["Temperature", "Above 100.4 F"],
            ["Head acceleration", "Relative value above 80"],
            ["Bite force", "Relative value above 220"],
        ],
    )
    note(doc, "Note. The alert badge is the count of these points across the loaded series. It is not a count of medical events.")

    heading2(doc, "Parent View")
    body(
        doc,
        "The parent dashboard is a different screen from the athlete dashboard. Figure 2.10 shows the "
        "photograph used in this opening. The header names Alex Smith, age 16, football, quarterback. A "
        "banner reads Concussion Risk, High Risk, and Real-time monitoring active. Six tiles follow: heart "
        "rate 185 BPM, last impact 86g one minute ago, SpO2 97 percent, body temperature 99.9 F, bite force "
        "172 N, and head acceleration 53 g. A footer states that the view is read-only and that profile "
        "changes go through the athlete. The bottom bar again offers Dashboard and History.",
    )
    body(
        doc,
        "The people and the numbers on this screen are generated in the parent component. A timer replaces "
        "heart rate, temperature, SpO2, bite force, head acceleration, and the last-impact line about every "
        "three seconds, and it sets the banner from those drawn values. The screen does not subscribe to "
        "the holder board, and it does not read the athlete's stored rows. The empty state for an unlinked "
        "athlete exists in the component and is not reachable, because the linked flag is a constant. "
        "Figure 2.10 is the intended layout of a remote view. It is not evidence that a parent can see a "
        "child's stream.",
    )
    add_phone_figure(
        doc,
        "ui-parent.png",
        "Figure 2.10. Parent read-only view of one athlete. The name, the risk banner, and the tile values are simulated in the client.",
    )

    heading2(doc, "Trainer View")
    body(
        doc,
        "The trainer dashboard is a roster. Figure 2.11 shows Varsity Football with five athletes. Filter "
        "chips read All (5), High (1), Mod (2), Low (2), and Off (1). A team-status row repeats those "
        "counts. Each row gives a name, a position, a risk label, a last-impact integer, and a connection "
        "mark. In the photograph, Alex Martinez is a quarterback at high risk with 89g and the cause Impact "
        "event. Jordan Lee and Casey Wilson are at moderate risk with the cause Abnormal vitals. Taylor Brown "
        "is at low risk. Morgan Davis is at low risk and carries the disconnected mark. An athlete can appear "
        "in a risk count and in the Off count together, because those filters test different fields. The "
        "roster is a fixed array in the trainer component. It does not update from Bluetooth.",
    )
    add_phone_figure(
        doc,
        "ui-trainer-roster.png",
        "Figure 2.11. Trainer roster for a simulated varsity football team. Filters count risk and a disconnected device separately.",
    )
    body(
        doc,
        "Pressing a row opens a sheet. Figure 2.12 is that sheet for Alex Martinez, age 17, quarterback. "
        "It repeats the current risk, heart rate 185 BPM, last impact 89 g, and Device: Connected. View "
        "full history closes the sheet and opens the history route. Closing the sheet returns to the roster. "
        "The sheet reads the same fixed record as the row. It does not open a live stream for that name.",
    )
    add_phone_figure(
        doc,
        "ui-trainer-sheet.png",
        "Figure 2.12. Trainer detail sheet for one simulated athlete. View full history opens the history route.",
    )

    heading2(doc, "What the Photographs Do and Do Not Show")
    body(
        doc,
        "Table 2.5 is the boundary around this chapter. The athlete dashboard and history are wired to the "
        "sample path: a notify line updates the cards, and history merges phone rows with cloud rows. The "
        "values in Figures 2.4 through 2.9 are whatever that path held when the photographs were taken. "
        "The parent and trainer photographs document layout and copy. They do not document a live mouthguard.",
    )
    caption_table(doc, "Table 2.5. Which photographed screens read a live stream.")
    add_table(
        doc,
        ["Figure", "Screen", "Data on the screen"],
        [
            ["2.1", "Role selection", "Static choices. The selection is held until Continue."],
            ["2.2", "Profile setup", "Placeholder. No fields are stored."],
            ["2.3", "Activity selection", "The chosen mode is stored as a manual selection."],
            ["2.4 to 2.6", "Athlete dashboard", "Cards follow the latest parsed sample. The name and body size are literals."],
            ["2.7 to 2.9", "History", "Phone rows and cloud rows on one timeline. The alert count is chart marks."],
            ["2.10", "Parent view", "A timer draws new tile values. No Bluetooth subscription."],
            ["2.11 and 2.12", "Trainer roster and sheet", "A fixed list of five athletes."],
        ],
    )

    heading1(doc, "Chapter Three: What the Screens Are Connected To")
    heading2(doc, "The Athlete Sample Path")
    body(
        doc,
        "Behind Figures 2.4 through 2.9 the holder board notifies one text line on the Nordic UART transmit "
        "characteristic. The phone, through react-native-ble-plx, decodes that value and parses a seven-field "
        "line, or a legacy three-field line [6]. A parsed line updates the dashboard cards immediately. About every two seconds the client "
        "writes a snapshot and an outbox entry on the phone and, when a user is signed in, inserts a row. "
        "History loads a one-, three-, or five-minute window from the phone copy and from the cloud, drops "
        "duplicates, and draws the charts. Leaving the dashboard removes the subscription.",
    )
    body(
        doc,
        "The activity label on those rows is the label from Figure 2.3, or a later press on the dashboard "
        "segments, or a confirmation of the banner in Figure 2.6. The detector that raises the banner looks "
        "at a short buffer of recent samples. It can suggest Game, Training, or Sleep. Confirmation rewrites "
        "local rows in the prompting window and leaves rows already inserted in the database on their old label.",
    )
    heading2(doc, "Screens Still Outside the Photograph Set")
    body(
        doc,
        "Sign-in, the pairing scan, the five-step calibration sequence, and the parent and trainer profile "
        "placeholders are in the client and are not in Chapter Two's figures. Calibration advances a label "
        "and does not record a baseline. Pairing can store one demonstration sample when the holder is not "
        "found, and that sample can appear on the dashboard, so a connected-looking screen is not by itself "
        "proof that a mouthguard was in the mouth. Parent linking, trainer invites, and athlete approval "
        "are titles on placeholder routes.",
    )
    heading2(doc, "What This Opening Leaves for Later Chapters")
    body(
        doc,
        "The line format, the parser outcomes, the columns of the insert, the duplicate-insert path, and a "
        "bench protocol for packet delivery are specified by the same client and are not re-derived here. "
        "They belong in the chapters that follow this interface account. So does any comparison between the "
        "rule-based detector and a trained model. No labeled human-subjects set was collected for this "
        "manuscript, so no classifier score is stated. Angular head kinematics are not computed from the "
        "current line.",
    )

    heading1(doc, "Chapter Four: Conclusion")
    heading2(doc, "Summary")
    body(
        doc,
        "This opening of the thesis documents the GuardSync interface as a pipeline of screens. A person "
        "chooses a role. An athlete passes a profile placeholder, pairing, and a calibration sequence that "
        "does not store a baseline, then chooses Training, Game, or Sleep. The dashboard shows the latest "
        "sample in an order that depends on that choice, and it colors zones defined in the client. A "
        "banner can suggest another activity and waits for confirmation. History places the same session "
        "on one timeline and counts chart marks. The parent view and the trainer roster show the layout "
        "planned for remote reading, using simulated people. The photographs are the evidence for that "
        "account. The software is a foundation for sideline display. Clinical recognition of concussion "
        "remains a medical judgment [3].",
    )
    heading2(doc, "Next Chapters")
    body(
        doc,
        "The next writing returns to the holder-board contract and to storage. When the mouthguard board "
        "replaces the Argon holder, field types, units, and the Bluetooth service may change, and the "
        "cards in Figures 2.4 and 2.5 will have to move with them. Calibration should record a baseline, "
        "or the activity screen should stop saying that calibration has prepared the session. Parent and "
        "trainer views should read shared rows only after a consent and linking design, in place of the "
        "timer and the fixed roster in Figures 2.10 through 2.12. Until those chapters are written, Table 2.5 "
        "is the limit on what the photographs may be said to show.",
    )

    heading1(doc, "References")
    refs = [
        "[1] D. B. Camarillo, P. B. Shull, J. A. Mattson, R. Shultz, and D. R. Garza, “An instrumented mouthguard for measuring linear and angular head impact kinematics in American football,” Ann. Biomed. Eng., vol. 41, no. 9, pp. 1939–1949, 2013, doi: 10.1007/s10439-013-0801-y.",
        "[2] Y. Liu, A. G. Domel, S. A. Yousefsani, J. Kondic, G. Grant, M. Zeineh, and D. B. Camarillo, “Validation and comparison of instrumented mouthguards for measuring head kinematics and assessing brain deformation in football impacts,” Ann. Biomed. Eng., vol. 48, no. 11, pp. 2580–2598, 2020, doi: 10.1007/s10439-020-02629-3.",
        "[3] P. McCrory et al., “Consensus statement on concussion in sport—the 5th international conference on concussion in sport held in Berlin, October 2016,” Br. J. Sports Med., vol. 51, no. 11, pp. 838–847, 2017, doi: 10.1136/bjsports-2017-097699.",
        "[4] Particle Industries, “Argon datasheet.” [Online]. Available: https://docs.particle.io/reference/datasheets/wi-fi/argon-datasheet/",
        "[5] Expo, “Development builds — Introduction.” [Online]. Available: https://docs.expo.dev/develop/development-builds/introduction/",
        "[6] dotintent, “react-native-ble-plx,” version 3.5, software library. [Online]. Available: https://github.com/dotintent/react-native-ble-plx",
    ]
    for ref in refs:
        hanging_ref(doc, ref)

    heading1(doc, "Appendix A: Disclosure of Generative AI Use")
    body(
        doc,
        "The Office of Graduate Studies asks students who use generative models in an electronic thesis "
        "to obtain committee permission, to name the model and version, to review the output, and to "
        "remain responsible for the manuscript. This appendix records the use. It does not by itself "
        "prove that the committee has granted permission. That permission should be confirmed and, if "
        "required, noted here before submission.",
    )
    body(
        doc,
        "Generative tools were used while preparing this thesis and the GuardSync client. In Cursor, "
        "Grok 4.7, accessed in September 2026, was used to read the repository, to draft and revise "
        "mobile-application structure, and to draft this manuscript from that source and from photographs "
        "of the Android screens. The manuscript was checked against the client so that placeholder screens "
        "and simulated rosters were not described as a live mouthguard stream. The photographs were taken "
        "on the development build. The author remains solely responsible for the accuracy and integrity "
        "of the thesis and the software.",
    )

    heading1(doc, "Appendix B: Disclosure of Assistive AI Use")
    body(
        doc,
        "Assistive use of the same tool, Cursor Grok 4.7, accessed in September 2026, included "
        "suggestions for grammar, heading consistency, and organization of the chapters. Suggestions "
        "were accepted only when they matched the source or a cited paper. Committee permission for "
        "assistive use should be confirmed with the permission noted in Appendix A. Responsibility "
        "for the manuscript remains with the author.",
    )

    heading1(doc, "Appendix C: Copyright Permissions")
    body(
        doc,
        "The tables in this manuscript were written for this thesis. The figures are photographs of the "
        "author's GuardSync screens on an Android development build. No figure, table, or long quotation "
        "is reproduced from a publisher, so no permission letter is attached. If a later draft adds a "
        "published figure, that figure needs a permission letter or a completed USF fair-use worksheet, "
        "and the chapter that uses it must carry the citation the copyright holder requires.",
    )

    heading1(doc, "Appendix D: Supplementary Notes for Later Chapters")
    body(
        doc,
        "This opening does not repeat the parser, the notify handler, or the insert payload. Those listings "
        "belong with the chapters on the holder-board contract and on storage. Until they are restored, "
        "the repository remains the source for the screens in Chapter Two. No institutional-review letter "
        "is attached. This thesis does not report a human-subjects dataset.",
    )

    page_break(doc)
    p = doc.add_paragraph()
    set_paragraph_format(p, double=True, first_line=False, center=True)
    add_text(p, "About the Author", bold=True)
    body(
        doc,
        "Myat Phone Tha completed this undergraduate thesis in computer science at the University of "
        "South Florida. The software described here is GuardSync, a mobile companion for a mouthguard "
        "prototype. This opening of the manuscript documents the interface pipeline from role selection "
        "through the athlete dashboard, history, and the simulated parent and trainer views.",
    )

    saved = []
    for target in (OUT, OUT.with_name("GuardSync_ETD_draft_updated.docx")):
        try:
            doc.save(target)
            saved.append(str(target))
        except PermissionError:
            continue
    if not saved:
        alt = OUT.with_name("GuardSync_ETD_draft_with_code.docx")
        doc.save(alt)
        saved.append(str(alt))
    print("Wrote " + "; ".join(saved))
    print(f"Abstract word count: {len(ABSTRACT.split())}")


if __name__ == "__main__":
    build()

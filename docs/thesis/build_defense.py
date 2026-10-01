"""Master's defense slides for the GuardSync thesis. About 20 minutes."""

from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Emu, Inches, Pt

OUT = Path(__file__).resolve().parent / "GuardSync_defense.pptx"
FIG = Path(__file__).resolve().parent / "figures"
PHONE_ASPECT = 576 / 1024

GREEN = RGBColor(0x00, 0x67, 0x47)
GOLD = RGBColor(0xCF, 0xC4, 0x93)
INK = RGBColor(0x1C, 0x1C, 0x1C)
MUTED = RGBColor(0x3F, 0x4A, 0x45)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
CREAM = RGBColor(0xF7, 0xF4, 0xEC)
CARD = RGBColor(0xEE, 0xF3, 0xEF)

W = Inches(13.333)
H = Inches(7.5)


def set_run(run, text, size, color, bold=False):
    run.text = text
    run.font.size = Pt(size)
    run.font.color.rgb = color
    run.font.bold = bold
    run.font.name = "Calibri"


def add_text(slide, text, x, y, w, h, size, color, bold=False, align=PP_ALIGN.LEFT):
    box = slide.shapes.add_textbox(x, y, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = align
    set_run(p.add_run(), text, size, color, bold)
    return box


def notes(slide, text):
    slide.notes_slide.notes_text_frame.text = text


def chrome(slide, page, total):
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(0.12), H)
    bar.fill.solid()
    bar.fill.fore_color.rgb = GREEN
    bar.line.fill.background()
    foot = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, Inches(7.22), W, Inches(0.28))
    foot.fill.solid()
    foot.fill.fore_color.rgb = GREEN
    foot.line.fill.background()
    add_text(slide, "GuardSync  ·  Master's thesis defense", Inches(0.4), Inches(7.24), Inches(8), Inches(0.24), 11, WHITE)
    add_text(slide, f"{page}  /  {total}", Inches(11.4), Inches(7.24), Inches(1.6), Inches(0.24), 11, WHITE, align=PP_ALIGN.RIGHT)


def title_slide(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    bg = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, W, H)
    bg.fill.solid()
    bg.fill.fore_color.rgb = GREEN
    bg.line.fill.background()
    gold = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, Inches(5.55), W, Inches(0.08))
    gold.fill.solid()
    gold.fill.fore_color.rgb = GOLD
    gold.line.fill.background()
    add_text(s, "UNIVERSITY OF SOUTH FLORIDA", Inches(0.7), Inches(0.55), Inches(11), Inches(0.35), 16, GOLD, True)
    add_text(s, "A companion application for a\nsensor-embedded athletic mouthguard", Inches(0.7), Inches(1.7), Inches(11.5), Inches(2.2), 40, WHITE, True)
    add_text(s, "Master's thesis defense", Inches(0.7), Inches(4.35), Inches(10), Inches(0.4), 22, CREAM)
    add_text(s, "Myat Phone Tha", Inches(0.7), Inches(5.9), Inches(8), Inches(0.4), 22, WHITE, True)
    add_text(s, "Department of Computer Science and Engineering", Inches(0.7), Inches(6.4), Inches(10), Inches(0.35), 16, CREAM)
    notes(
        s,
        "Thank the committee. One sentence: GuardSync is the phone application that receives a Bluetooth text line from a holder board, shows it, and stores it. Say you will be clear about what the prototype does not do.",
    )


def section_slide(prs, kicker, title, bullets, note, page, total):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    fill = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, W, H)
    fill.fill.solid()
    fill.fill.fore_color.rgb = WHITE
    fill.line.fill.background()
    chrome(s, page, total)
    add_text(s, kicker.upper(), Inches(0.55), Inches(0.32), Inches(12), Inches(0.32), 14, GREEN, True)
    add_text(s, title, Inches(0.55), Inches(0.68), Inches(12), Inches(1.15), 32, INK, True)
    y = Inches(2.15)
    for bullet in bullets:
        add_text(s, bullet, Inches(0.7), y, Inches(11.8), Inches(0.85), 22, INK)
        y += Inches(0.9)
    notes(s, note)
    return s


def two_col(prs, kicker, title, left_title, left_items, right_title, right_items, note, page, total):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    fill = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, W, H)
    fill.fill.solid()
    fill.fill.fore_color.rgb = WHITE
    fill.line.fill.background()
    chrome(s, page, total)
    add_text(s, kicker.upper(), Inches(0.55), Inches(0.32), Inches(12), Inches(0.3), 14, GREEN, True)
    add_text(s, title, Inches(0.55), Inches(0.65), Inches(12), Inches(0.8), 30, INK, True)
    for x, head, items in (
        (Inches(0.5), left_title, left_items),
        (Inches(6.85), right_title, right_items),
    ):
        card = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(1.8), Inches(5.9), Inches(5.0))
        card.fill.solid()
        card.fill.fore_color.rgb = CARD
        card.line.fill.background()
        add_text(s, head, x + Inches(0.3), Inches(2.0), Inches(5.3), Inches(0.5), 20, GREEN, True)
        yy = Inches(2.65)
        for item in items:
            add_text(s, item, x + Inches(0.3), yy, Inches(5.3), Inches(0.7), 18, INK)
            yy += Inches(0.72)
    notes(s, note)


def ui_gallery(prs, kicker, title, items, note, page, total):
    """A row of phone screenshots. items are (filename, caption)."""
    s = prs.slides.add_slide(prs.slide_layouts[6])
    fill = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, W, H)
    fill.fill.solid()
    fill.fill.fore_color.rgb = WHITE
    fill.line.fill.background()
    chrome(s, page, total)
    add_text(s, kicker.upper(), Inches(0.55), Inches(0.28), Inches(12), Inches(0.28), 14, GREEN, True)
    add_text(s, title, Inches(0.55), Inches(0.55), Inches(12.2), Inches(0.7), 28, INK, True)

    img_h_in = 4.7
    img_w_in = img_h_in * PHONE_ASPECT
    gap_in = 0.38
    n = len(items)
    row_w = n * img_w_in + (n - 1) * gap_in
    x0 = (13.333 - row_w) / 2
    y_img = 1.45
    for i, (filename, caption) in enumerate(items):
        x = x0 + i * (img_w_in + gap_in)
        s.shapes.add_picture(
            str(FIG / filename),
            Inches(x),
            Inches(y_img),
            Inches(img_w_in),
            Inches(img_h_in),
        )
        add_text(
            s,
            caption,
            Inches(x - 0.12),
            Inches(y_img + img_h_in + 0.02),
            Inches(img_w_in + 0.24),
            Inches(0.72),
            14,
            MUTED,
            align=PP_ALIGN.CENTER,
        )
    notes(s, note)
    return s


def build():
    prs = Presentation()
    prs.slide_width = W
    prs.slide_height = H
    prs.core_properties.title = "GuardSync master's thesis defense"
    prs.core_properties.author = "Myat Phone Tha"
    total = 19

    title_slide(prs)

    section_slide(
        prs,
        "The claim",
        "A phone path for one Bluetooth text line",
        [
            "GuardSync receives a text line from an nRF52840 on a Particle Argon board.",
            "It shows the line, saves it on the phone, and uploads it when the athlete is signed in.",
            "The athlete, not the software, confirms the activity label.",
            "This is not a concussion test, and the Argon is not the mouthguard.",
        ],
        "Read the four lines slowly. Pause on the last one. If they remember one slide, it should be this.",
        2,
        total,
    )

    section_slide(
        prs,
        "Problem",
        "A sensor reading still has to reach a person",
        [
            "A short head impact can be missed by someone watching from the sideline.",
            "A mouthguard can hold sensors because the upper teeth are fixed to the skull.",
            "The reading is useful only after a phone can receive it, show it, and keep it.",
            "Deciding that a concussion occurred stays with a clinician.",
        ],
        "Cite the idea, not a number. Camarillo and Liu motivate the mouthguard. McCrory is why you do not diagnose. Do not claim your board has been compared with a headform.",
        3,
        total,
    )

    two_col(
        prs,
        "Hardware",
        "The chip is real. The board is a holder.",
        "On the bench today",
        [
            "Chip: Nordic nRF52840",
            "Board: Particle Argon",
            "Bluetooth text line in",
            "ESP32 Wi-Fi is unused",
        ],
        "Not this project",
        [
            "Not the mouthguard board",
            "Not an nRF52840 DK",
            "Message format can change",
            "No firmware in the repository",
        ],
        "If they ask 'is this the mouthguard?': the chip is the one planned for the mouthguard. The Argon is a holder so the phone could be built first. The Nordic development kit is a different board.",
        4,
        total,
    )

    section_slide(
        prs,
        "Message format",
        "One comma-separated line, about every 2 seconds",
        [
            "Fields: uptime, minutes, head acceleration, heart rate, oxygen, temperature, bite force.",
            "The phone accepts a 7-field line and an older 3-field line.",
            "A short line fills oxygen, temperature, and bite force with defaults.",
            "Those defaults are not measurements.",
        ],
        "Example if they want one: 123456,15,95,72,98,98.4,160. Say the defaults on a short line are not measurements. File: ble/nordicUart.ts.",
        5,
        total,
    )

    section_slide(
        prs,
        "Path",
        "From the notify to a stored row",
        [
            "1.  Bluetooth notify  →  base64 decode  →  parse",
            "2.  Dashboard updates on every accepted line",
            "3.  Every 2 seconds: save on the phone, then insert if signed in",
            "4.  History merges the phone and the cloud, and does not wait forever",
        ],
        "Point at the code if they ask. uartStream.ts receives the notify. useArgonLiveTelemetry.ts has the 2-second gate. upload.ts does the insert. History gives the cloud 8 seconds, then keeps the local rows.",
        6,
        total,
    )

    two_col(
        prs,
        "Storage",
        "What actually gets saved",
        "Its own column",
        [
            "Head acceleration → metric_v1",
            "Heart rate → metric_v2",
            "The whole line → csv_raw",
            "Mode, session, and time",
        ],
        "Only inside the line",
        [
            "Oxygen",
            "Temperature",
            "Bite force",
            "Active minutes",
        ],
        "History recovers oxygen, temperature, and bite force by parsing csv_raw again. If that parse fails, the old defaults come back. Table name: argon_telemetry_samples. Signed-in user id is sent with the row.",
        7,
        total,
    )

    section_slide(
        prs,
        "Labels",
        "The athlete confirms Training, Game, or Sleep",
        [
            "A fixed set of rules can suggest a different label.",
            "The stored label does not change until the athlete says yes.",
            "Yes starts a new session and relabels recent rows on the phone.",
            "Rows already in the database are not rewritten.",
        ],
        "Rules live in modes/detect.ts. Confirm is modes/confirmChange.ts. Confidence numbers on the rules are constants, not learned probabilities. Night uses the phone clock.",
        8,
        total,
    )

    two_col(
        prs,
        "The two unfinished readings",
        "These numbers are not the final product",
        "Head acceleration",
        [
            "One integer. The card adds g.",
            "A hit needs distance, velocity, and time.",
            "Measure those only during the hit.",
            "The app does not compute them.",
        ],
        "Bite force",
        [
            "One integer, with an N label",
            "Could be a hard bite",
            "Could be a collision",
            "The app cannot tell them apart",
        ],
        "This is the slide to slow down on. The color bands use the raw integers. A larger number is treated as a larger event. That is not a measurement of how the head moved, and it is not a way to know why the jaw loaded.",
        9,
        total,
    )

    section_slide(
        prs,
        "What you can see",
        "The athlete path is the one that uses Bluetooth",
        [
            "Sign in, choose Athlete, pair, or use the demo line.",
            "Calibration is five labels. It stores no baseline.",
            "The dashboard is the live view. History is 1, 3, or 5 minutes.",
            "Parent and trainer screens use made-up people, not this Bluetooth line.",
        ],
        "If the Argon is not in the room, use the demo path and say so. The demo writes a fixed line and the device id 'demo'. Do not call that a collected impact. The cards can also show 95 before any real reading, and the band treats that as moderate. The next four slides are photographs of the Android build.",
        10,
        total,
    )

    ui_gallery(
        prs,
        "Interface",
        "Role, profile, then the activity for this session",
        [
            ("ui-role.png", "Choose Athlete, Parent, or Trainer"),
            ("ui-profile.png", "Profile is a placeholder. Continue opens pairing."),
            ("ui-activity.png", "Training, Game, or Sleep, chosen by the athlete"),
        ],
        "Walk left to right. Continue on the role screen stays off until a card is selected. The profile screen stores nothing. Pairing and the five calibration labels sit between the second and third photos and were not photographed. Calibration stores no baseline. The activity choice is the label later rows carry.",
        11,
        total,
    )

    ui_gallery(
        prs,
        "Interface",
        "The live dashboard, then a question before the label changes",
        [
            ("ui-dashboard-game.png", "Game session. 66g, band reads Low."),
            ("ui-dashboard-elevated.png", "Same screen. 149g, band reads High."),
            ("ui-mode-prompt.png", "Training stays until the athlete chooses."),
        ],
        "The name and body size are literals, not a loaded profile. Game puts head acceleration first. Colors are interface cuts: warning at 90, high at 120. Say the band is a reading aid, not a diagnosis. On the third photo the detector suggests Game while Training is still selected. Switch relabels recent phone rows. Keep leaves the label. Database rows already inserted are not rewritten.",
        12,
        total,
    )

    ui_gallery(
        prs,
        "Interface",
        "History is one timeline, with chart marks counted as alerts",
        [
            ("ui-history-overview.png", "1 minute, 36 alerts, Training and Game on one strip"),
            ("ui-history-hr.png", "Heart rate and SpO2. Red bars are critical marks."),
            ("ui-history-temp.png", "Temperature is orange. Red is still the critical mark."),
        ],
        "The badge counts chart marks, not medical events. This window was set to Sleep and the banner suggests Game. The strip is the confirmed activity over the same seconds as the bars. Heart rate is marked above 180 or below 50. SpO2 below 92. Temperature above 100.4. Those cuts are not the same cuts as the dashboard colors.",
        13,
        total,
    )

    ui_gallery(
        prs,
        "Interface",
        "Parent and trainer screens use simulated people",
        [
            ("ui-parent.png", "Parent view. Values are drawn on a timer."),
            ("ui-trainer-roster.png", "A fixed roster of five athletes"),
            ("ui-trainer-sheet.png", "The sheet reads that same fixed record"),
        ],
        "Slow down here so nobody thinks these are live mouthguards. The parent screen replaces the tiles about every three seconds inside the component. The trainer list is a fixed array. The disconnected mark is separate from the risk label. View full history only opens the history route. Neither screen subscribes to Bluetooth.",
        14,
        total,
    )

    two_col(
        prs,
        "Results by inspection",
        "No packet test was logged",
        "Implemented",
        [
            "Scan, connect, parse, show",
            "Phone outbox and cloud insert",
            "History survives a slow network",
            "Athlete-confirmed activity label",
        ],
        "Not implemented",
        [
            "Counted delivery or latency",
            "A trained model",
            "A real calibration baseline",
            "Encrypted Bluetooth",
        ],
        "Say this before they ask. Chapter Eight is an inspection of version 1.0.0, not a bench campaign. If they ask for a percentage, say you do not have one.",
        15,
        total,
    )

    section_slide(
        prs,
        "A defect to know",
        "One reading can be inserted twice",
        [
            "A successful live upload leaves the phone copy in the outbox.",
            "History later uploads the newest outbox rows again.",
            "The chart hides the pair. The database can keep both.",
            "There is no uniqueness rule in the checked-in SQL.",
        ],
        "Key is device id plus the phone's receipt time. Live success does not remove the outbox row. Only a successful history sync removes it, after it may have inserted again. This is a real bug. Do not defend it as a feature.",
        16,
        total,
    )

    section_slide(
        prs,
        "Contribution",
        "A documented path, with the limits written down",
        [
            "A phone client for the holder board's Bluetooth text line.",
            "Local storage, a signed-in insert, and one history timeline.",
            "An activity label that the athlete has to confirm.",
            "A clear statement of what head acceleration and bite force are not.",
        ],
        "The contribution is the software path and the honest boundary. It is not a biomechanics result and not a clinical result.",
        17,
        total,
    )

    section_slide(
        prs,
        "Next",
        "What changes when the mouthguard board arrives",
        [
            "New message format: field types, rate, and Bluetooth service.",
            "For a hit: distance, velocity, and contact time on that short window.",
            "For bite force: this athlete's rest and hardest bite, then bite versus collision.",
            "One logged lab session, then bonding and encryption.",
        ],
        "Resting jaw and a deliberate hard bite were the point of calibration. That screen does not record them yet. A collision is a short spike of bite force together with head acceleration. A bite holds while the head stays quiet.",
        18,
        total,
    )

    s = prs.slides.add_slide(prs.slide_layouts[6])
    bg = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, W, H)
    bg.fill.solid()
    bg.fill.fore_color.rgb = GREEN
    bg.line.fill.background()
    add_text(s, "Questions", Inches(0.7), Inches(2.4), Inches(12), Inches(1.2), 60, WHITE, True)
    add_text(s, "I can walk the parser, the insert, or either unfinished reading.", Inches(0.7), Inches(3.8), Inches(11), Inches(0.8), 22, CREAM)
    notes(
        s,
        "Stop. Do not fill silence with a new claim. If you do not know, say which chapter states the limit. Files to offer: ble/nordicUart.ts and telemetry/upload.ts.",
    )

    # Closing slide is 15 if title is unnumbered in the footer scheme.
    # Title has no footer. Content slides were numbered 2-14, questions is 15.
    # I passed total=16 and numbered 2-14. Questions has no number. Fix by
    # not worrying: title + 13 content + questions = 15 slides. I set total=16
    # and started content at 2 through 14, that is title + 13 numbered = 14
    # content slides with numbers 2-14, plus questions. Count:
    # 1 title, 2 claim, 3 problem, 4 hardware, 5 message, 6 path, 7 storage,
    # 8 labels, 9 unfinished, 10 see, 11 results, 12 defect, 13 contribution,
    # 14 next, 15 questions. Numbered slides used pages 2 through 14. That's
    # 13 numbered slides. 1 + 13 + 1 = 15. The footer says /16. I should fix
    # the total to 15 and the last content slide is page 14. Slides:
    # page numbers I passed: 2,3,4,5,6,7,8,9,10,11,12,13,14. That's 13 chrome
    # slides + title + questions = 15. Footer total should be 15. The last
    # content number 14 is correct if questions is 15 and title is 1 but title
    # has no number. Showing 14/15 on the last content slide is fine. Change
    # total from 16 to 15. I already baked 16 into calls. I'll fix by
    # regenerating... easier to set total = 15 in the calls. I'll do a
    # replace after write if I notice. I'll fix now before the user sees it
    # by editing the constant... the calls already used total=16. I'll update
    # the file to use 15. Let me just leave and fix with search replace.

    prs.save(OUT)
    print(f"Wrote {OUT}")
    print(f"slides: {len(prs.slides)}")


if __name__ == "__main__":
    build()

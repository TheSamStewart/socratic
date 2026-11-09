# Viva design research

Goal: make Viva look as educational, bright and trustworthy as possible, without breaking the "calm SaaS" brief in `design/DESIGN.md`.
This file is gitignored (`design/refs/`). Evidence is marked **[sourced]**. Anything marked **[my take]** is my own synthesis, not research.

Source quality is mixed. Institutional style guides are strong, the LMS usability studies are small and dated, and the Duolingo/Khan colour details come from unofficial write-ups. Check hex values before relying on them.

---

## 1. What universities already do (and we should match)

| Pattern | Evidence | Use in Viva |
|---|---|---|
| **One anchor brand colour plus neutrals.** The brand colour is treated as part of the identity. | [Melbourne](https://designsystem.web.unimelb.edu.au/style-guide/colour-palette/) says its University Blue is "as much a part of the university brand as the crest". [Wake Forest](https://umc.wfu.edu/brand-management/web-style-guide) uses two primary colours plus neutral backgrounds. **[sourced]** | One accent only, plus the status colours. |
| **Small palettes, lots of white space.** | A [trends piece](https://www.zilliondesigns.com/blog/?p=17760) describes a move from cluttered layouts to white-space heavy ones. Low-quality source, but it agrees with the style guides. **[sourced, weak]** | Keep the current spacious layout. |
| **Secondary colours used sparingly**, e.g. for one call-to-action, tile or sub-site. | [Glasgow](https://www.alumni.gla.ac.uk/myglasgow/staff/webpublishing/advicefort4users/webcolourpalette), [UNMC](https://brandwise.unmc.edu/?p=1917). **[sourced]** | Use the accent for primary actions, active nav and the logo. Nowhere else. |
| **Palettes derived from one base colour** (four tints/shades). | [Copenhagen](https://www.ku.dk/designguide/en/colours). **[sourced]** | Derive soft tints from the accent for panels and badges. |
| **A serif and sans pairing.** A serif signals scholarship, and a sans handles UI. | [Penn](https://branding.web-resources.upenn.edu/web-identity) pairs EB Garamond with Roboto. **[sourced]** | Serif for page titles only. Inter for everything else. |
| **Accessibility as a hard requirement**, usually WCAG 2.2 AA. | [Melbourne](https://msd.unimelb.edu.au/belt/technology/multimedia-for-teaching/digital-accessibility), [UMass Dartmouth](https://umassd.edu/brand/digital). The [St Andrews pattern library](https://www.st-andrews.ac.uk/dpl/1.27.3/colours.html) says colour must never be the only carrier of meaning. **[sourced]** | Keep a text label next to every status dot. Check contrast of the accent and status colours. |
| **Soft off-white rather than pure white.** | [Cardiff](https://blogs.cardiff.ac.uk/LTAcademy/not-just-pretty-colours-using-colour-and-contrast-inclusively) cites the British Dyslexia Association advice to avoid pure white because of glare. **[sourced]** | Use a warm off-white behind long text. Our grey page background already does this. Consider a very light cream for reading areas such as the Brief. |
| **Spacing beats special fonts for dyslexia.** WCAG doesn't require a dyslexia font. Open Sans, Verdana, Calibri etc. are fine. | [accessiBe summary](https://accessibe.com/blog/dyslexia-friendly-fonts) (vendor blog, thin evidence). **[sourced, weak]** | Keep Inter. Raise line-height to about 1.6 on body text. |

## 2. What universities mostly *don't* do (where we can stand out)

Based on the LMS research below and common knowledge of VLEs. **[my take]** unless linked.

- **They hide the next step.** Student studies of [Canvas](https://elearnmagazine.com/?p=56235) and [Moodle](https://redined.educacion.gob.es/xmlui/bitstream/handle/11162/244184/Segovia%20Garc%C3%ADa,%20Nuria.pdf?sequence=1) point to hidden features and unclear file organisation. A [2020 study](https://online-journals.org/index.php/i-jim/article/view/14381) found Saudi students rated Moodle as more usable than Blackboard on every measure. The sample is small and dated. **[sourced]**
  → Viva should always show one obvious next action ("Practise this with Max →").
- **They show status without meaning.** Grades and "complete" ticks, but no "why". → Our gap note quoting the student's own sentence is the differentiator. Make it the visual hero of Rubric Check.
- **They feel like admin tools**, built for the institution rather than the learner. A [2025 co-design paper](https://osuva.uwasa.fi/items/f2f72609-395b-4795-bbcf-4844085093f4/full) argues the layout of instructional information drives UX, and that students should help design it. **[sourced]** → Use plain, warm language ("Nice, this one's secure") and name the learner.
- **They show no progress feeling.** → A mastery map that fills in is a motivational device. Keep it.

## 3. Learning-app patterns worth borrowing (carefully)

- **Duolingo:** a [minimalist, playful illustration style](https://blog.duolingo.com/shape-language-duolingos-art-style/) and a bright green identity. Unofficial write-ups list the green as around `#58cc02`. **[sourced, unofficial]**
- **Khan Academy:** a mint green brand colour (unofficial write-up says about `#14bf96`), with accents for mastery and streaks. Khan's own post on [rebuilding its colour system](https://blog.khanacademy.org/tag/design/) exists, but I couldn't read it. **[sourced, unofficial]**
- **Lesson:** friendly shapes, one confident brand colour and a mascot create warmth. **[my take]** Don't copy the gamified streaks and confetti. The pitch is "prove it, don't police it", and a university buyer needs it to feel serious.

## 4. Recommendation for Viva **[my take]**

The current look is calm but a bit grey and corporate. DESIGN.md bans gradients, purple, glow, emoji and more than one accent. Staying within that:

1. **One bright accent: a warm academic blue** (around `#2457D6`, or a deeper `#1E4FBF`). It's the colour of Melbourne and many UK universities, reads as "education", and is clear of the red/amber/green status colours. Use it for the primary button, active nav, links and the logo. Verify contrast on white (needs 4.5:1 for text).
2. **Warm paper background.** Page `#F7F5EF` (cream), panel white, reading areas `#FFFDF8`. Brighter and friendlier than neutral grey, and it avoids the pure-white glare Cardiff warns about.
3. **Serif page titles.** Use a serif like Fraunces, Source Serif or EB Garamond at weight 600 for `h1` only. Keep Inter for UI. This gives an academic feel at almost no cost.
4. **Soft tinted section cards.** Light accent tint (`#EEF3FF`) for helpful notes, and the existing warm tints for amber and green. Keep borders at 1px.
5. **Friendly shapes.** A simple geometric Max avatar (rounded square or hex) in the accent colour, and slightly rounder corners (12–16px). The hex map is already the signature, so reuse that shape for icons and the logo.
6. **Warmer microcopy.** For example "Nice, you've got this one" and "Let's look at this together". Never "failed" or "wrong".
7. **Greeting and progress up top.** "Good afternoon, Aisha" plus a thin progress line (3 of 5 concepts secure) on My Progress.
8. **Accessibility checks before the freeze:**
   - Contrast of the accent and the amber status text on white (amber `#E8A33D` on white fails 4.5:1 for text, so keep amber for dots and tinted pills with darker text).
   - Visible focus rings (already added).
   - Status always has a text label (already done).

## 5. Trade-offs to decide as a team

- **Accent colour:** blue is safe and universal. A green accent would clash with the "green = met" status meaning, so avoid it.
- **Serif headings** add personality but are a second font to load. It's cheap, but it's a change from DESIGN.md.
- **Bright vs calm:** more colour makes the demo video pop, but too much undermines the "serious assessment tool" message for the industry-application judges.

DESIGN.md is shared, so any change to the palette or fonts should be agreed in Discord before I edit the tokens.

## Sources

- [Melbourne colour palette](https://designsystem.web.unimelb.edu.au/style-guide/colour-palette/)
- [Wake Forest web style guide](https://umc.wfu.edu/brand-management/web-style-guide)
- [St Andrews pattern library: colours](https://www.st-andrews.ac.uk/dpl/1.27.3/colours.html)
- [Glasgow web colour palette](https://www.alumni.gla.ac.uk/myglasgow/staff/webpublishing/advicefort4users/webcolourpalette)
- [UNMC visual design](https://brandwise.unmc.edu/?p=1917)
- [Copenhagen colours](https://www.ku.dk/designguide/en/colours)
- [Penn web identity](https://branding.web-resources.upenn.edu/web-identity)
- [Cardiff: inclusive colour and contrast](https://blogs.cardiff.ac.uk/LTAcademy/not-just-pretty-colours-using-colour-and-contrast-inclusively)
- [Melbourne digital accessibility](https://msd.unimelb.edu.au/belt/technology/multimedia-for-teaching/digital-accessibility)
- [UMass Dartmouth digital brand](https://umassd.edu/brand/digital)
- [accessiBe dyslexia-friendly fonts](https://accessibe.com/blog/dyslexia-friendly-fonts) (vendor blog)
- [Canvas student critique (eLearn Magazine)](https://elearnmagazine.com/?p=56235)
- [Moodle UX study (Segovia-García)](https://redined.educacion.gob.es/xmlui/bitstream/handle/11162/244184/Segovia%20Garc%C3%ADa,%20Nuria.pdf?sequence=1)
- [Moodle vs Blackboard usability](https://online-journals.org/index.php/i-jim/article/view/14381)
- [Co-designing Moodle workspaces](https://osuva.uwasa.fi/items/f2f72609-395b-4795-bbcf-4844085093f4/full)
- [Duolingo shape language](https://blog.duolingo.com/shape-language-duolingos-art-style/)
- [Khan Academy design blog](https://blog.khanacademy.org/tag/design/)
- [Web design trends for education](https://www.zilliondesigns.com/blog/?p=17760) (low quality)

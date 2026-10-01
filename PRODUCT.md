# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary (client-facing surfaces):** engaged couples planning a wedding in the Greater Toronto Area, usually 6–18 months out. They are comparison-shopping several photo booth vendors at once, reading quotes on a phone between other wedding tasks, and forwarding them to a partner or parent who is paying. Their job is to decide whether this vendor is safe to book. Corporate and party clients also receive these surfaces, but the identity is wedding-first by decision.

**Primary (admin surface):** the owner-operator (one person) running the whole operation — quoting, agreements, scheduling attendants, chasing signatures. Works at a desk on desktop and checks things on a phone between events. The job is to see what needs action today without hunting.

## Product Purpose

An agreement and quote management system for Photobooth Guys: build and send quotes, generate agreements from templates, collect legally binding e-signatures with an audit trail, run a client portal, and track the lead-to-signed pipeline. Success is a couple who reads a quote and books without needing a phone call, and an operator who never loses a booking to a forgotten follow-up.

## Positioning

A decade-plus, family-run photo booth company with 200+ weddings delivered, serving the Greater Toronto Area. The credibility is longevity, volume, and a 4.9-star Google rating across 194 reviews. The paperwork a couple receives is the only proof of any of that they can see before the wedding day.

Calgary was previously served and is being wound down. It must not appear on any surface.

## Operating Context

- Leads arrive via the website and Bookly bookings; a lead requesting pricing is the trigger for a quote.
- Quotes are built in a three-step admin wizard (`/admin/quotes`): contact info → package & add-ons → review & download PDF. Multiple priced options can appear on one quote.
- The quote PDF is generated server-side with jsPDF by imperative drawing code (`app/api/quotes/generate-pdf/route.ts`). There is no HTML template, no Puppeteer, no react-pdf. Layout is coordinates in millimetres on A4.
- Emails are HTML tables with inline styles only, rendered through `lib/email/layout.ts` and sent via nodemailer/SMTP. They must survive Outlook (VML fallbacks are already in place).
- Admin routes: Overview, Clients, Import Events, Templates, Quotes, Leads, Agreements, Backdrop Links, Attendant Hubs.
- Clients also touch a portal (email + 6-digit code, 90-minute session), a public agreement signing page, a backdrop selection flow, and a post-event gallery-ready email.

## Capabilities and Constraints

- Next.js 15 App Router, React 18, TypeScript, Tailwind 3, Prisma/PostgreSQL, NextAuth.
- Design tokens exist as CSS custom properties scoped by `data-surface="client"` and `data-surface="admin"` in `app/globals.css`, aliased into Tailwind in `tailwind.config.ts`. Roughly 158 usages depend on the `--accent` alias, so token *names* are load-bearing even when values change.
- Much of the admin is written with inline `style` objects rather than Tailwind classes.
- Icons come from `@flaticon/flaticon-uicons` (attribution link is currently required in the admin sidebar).
- Charts use Recharts, which needs literal hex values — CSS variables do not resolve in SVG fill/stroke attributes (`app/lib/adminTheme.ts` holds the literals).
- PDF typography is limited to the jsPDF core fonts (Helvetica, Times, Courier) unless a font file is embedded as base64.
- **A client-facing quote email does not exist yet.** Thirteen templates use `renderEmailLayout`; none is a quote. This is a new surface, not a reskin.

### Real product facts

- Packages are hour-based: 2h $550, 3h $750, 4h $950, 5h $1150, 6h $1350 (defaults; per-quote overrides allowed). Custom multi-day packages are also supported.
- Add-ons: Unlimited Prints (hourly rate × package hours), Glam Booth ($75), Waiting Time ($50/hr).
- Standing terms: $100 retainer to secure the booking; balance due 7 days before the event; quote valid 30 days; attendant arrives 1 hour before start time for setup.
- Contact: 647-378-5332 · info@photoboothguys.ca · photoboothguys.ca

## Brand Commitments

- Name: **Photobooth Guys**. Domain `photoboothguys.ca`; app at `agreements.photoboothguys.ca`.
- **The logo:** a stacked serif "PG" monogram in black with a thin gold outline, sitting above the words PHOTOBOOTH GUYS set in widely tracked sans capitals. The file is not in the repository yet.
- **Gold is confined to the logo lockup.** It may appear inside the mark and nowhere else. Gold as the interface accent is the generic look being replaced, and the surrounding palette must be chosen so the black-and-gold mark sits comfortably without the design becoming a gold theme.
- The guest-facing artifact is the **2×6 printed photo strip** (most popular), with 4×6 prints, digital delivery, and GIFs also offered.
- Anti-references, named by the owner as generic AI defaults to avoid: cream ground + terracotta/clay accent + high-contrast serif headers on client surfaces; dark navy or near-black + gold accent + rounded-square logo tile on the dashboard. Both describe the outgoing design and are evidence, not authority.
- **No concepts or metaphors on any surface.** If a reader would need an element explained before it makes sense, it does not ship. The documents are documents.

### Client-facing copy rules

No em dashes. Plain conversational prose. No filler vocabulary: elevate, unlock, seamless, empower, and their relatives. Warm and professional, never salesy.

## Evidence on Hand

- Real: pricing table, add-on rates, terms language, contact details, package structure, admin route list, agreement/lead status vocabulary — all present in the codebase.
- Real: "decade-plus in business, 200+ weddings delivered, family-run, Greater Toronto Area" (owner-stated).
- Real: **Google rating 4.9 stars across 194 reviews.** Approved for use on client-facing surfaces.
- **Absent, must not be fabricated:** client testimonials, named couples, venue names, award badges, response-time or booking-rate statistics, and any photography of actual events. Any of these appearing in a mockup is placeholder content on the owner's replacement list and must be visibly marked as such.
- No logo file, brand photography, or type licences are in the repository yet.

## Product Principles

1. **The quote is the sales call.** For most couples it is the only artifact they see before deciding; it carries the burden of proving a decade of competence.
2. **Two registers, one identity.** Client surfaces persuade; the admin surface only has to be fast and legible for one person. They share tokens, not tone.
3. **Longevity over novelty.** Claims rest on 200+ weddings and eleven years, never on trend language or invented social proof.
4. **Survive the delivery channel.** Anything designed here has to render in Outlook, in jsPDF's coordinate space, and on a phone screen — a design that only works in a browser has not shipped.
5. **Never invent proof.** Prices, terms, and capabilities come from the codebase; testimonials and statistics that do not exist stay out.

## Accessibility & Inclusion

No formal standard has been set. Working requirement: body text at 4.5:1 contrast or better on both surfaces, 16px minimum on mobile inputs (already enforced to prevent iOS zoom), and status must never be communicated by color alone — the agreement pipeline states appear in charts and badges that a colorblind operator has to read correctly.

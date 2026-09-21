# Arnold BNB Studio

A static Jekyll site for an hourly studio rental in Olerai, Ongata Rongai.
No database, no backend, no API keys. Bookings arrive over WhatsApp.

---

## Run it locally

You need Ruby and Bundler.

```bash
bundle install
bundle exec jekyll serve --livereload
```

Open <http://localhost:4000>.

If you'd rather not install Ruby, you can skip straight to deploying —
GitHub Pages builds the site for you.

---

## Deploy to GitHub Pages

1. Create a repo and push this folder to the `main` branch.
2. Repo → **Settings** → **Pages**.
3. Under *Build and deployment*, set **Source** to *Deploy from a branch*,
   then pick **main** and **/ (root)**. Save.
4. Wait a minute, then open `https://<your-username>.github.io/<repo-name>`.

Now fix the URLs. In `_config.yml`:

```yaml
url: "https://<your-username>.github.io"
baseurl: "/<repo-name>"        # note the leading slash, no trailing slash
```

If you put the site at the root of a `<username>.github.io` repo instead,
set `baseurl: ""`.

Every internal link uses `relative_url`, so once those two lines are right,
all links, styles and scripts resolve correctly.

### Custom domain

1. Create a file named `CNAME` in the root containing only your domain:
   ```
   arnoldstudio.co.ke
   ```
2. At your registrar, point the domain at GitHub Pages:
   - **Apex domain** (`arnoldstudio.co.ke`) → four `A` records:
     `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - **Subdomain** (`www.arnoldstudio.co.ke`) → one `CNAME` record pointing to
     `<your-username>.github.io`
3. In `_config.yml`, set `url: "https://arnoldstudio.co.ke"` and `baseurl: ""`.
4. Repo → Settings → Pages → enable **Enforce HTTPS** once the certificate
   is issued (can take an hour).

---

## Change prices

**All pricing lives in `_data/pricing.yml`.** Edit that one file and the rate
table, the calculator, the booking form and the owner dashboard all update
together — there is no second copy to keep in sync.

```yaml
standard_rate: 350        # KES/hr, hours 1–2
discounted_rate: 300      # KES/hr, hours 3–5
day_rate: 2000            # flat, hours 6–10
extra_hour_rate: 300      # KES/hr past hour 10
weekend_surcharge_pct: 20
cleaning_fee: 500
service_fee_pct: 10
```

The public tier cards on the home and pricing pages read their display text
from the `tiers:` list further down the same file. If you change a rate,
update the matching `price:` string there too, or the cards will advertise
the old number.

### Add-ons

Edit `_data/addons.yml`. Each entry becomes a chip in the calculator, a
checkbox on the booking form and a row in the pricing table automatically.

```yaml
- key: massage_chair      # must be unique — it's used as a DOM id
  label: Massage chair
  price: 400
  emoji: "💆"
  per_unit: false
  note: "Shown under the label on the booking form."
```

### FAQ and testimonials

`_data/faq.yml` and `_data/testimonials.yml`. Same idea — add or remove
entries and the pages rebuild around them.

---

## Change the owner passphrase

`/owner.html` is gated by a SHA-256 hash. The plaintext passphrase is never
written in the source.

**The current passphrase is `arnold2026`. Change it before you go live.**

1. Go to <https://emn178.github.io/online-tools/sha256.html>
2. Type your new passphrase into the input box.
3. Copy the 64-character hash it produces.
4. Open `owner.html`, find this line near the bottom:

   ```js
   var OWNER_HASH = "edc122d518d2896c07de2b7ea02bfd883ba3e1dcd0b1fb46cd6bdb14ee562ab9";
   ```

5. Replace the hash between the quotes with yours. Save, commit, push.

If you get locked out after changing it, open your browser console and run
`localStorage.removeItem('abs_owner_ok')`, then reload.

> **This is a curtain, not a lock.** The hash is in the page source, so
> anyone determined can brute-force a weak passphrase offline. It keeps
> casual visitors and search engines out — that is all it is for. If this
> page ever holds something genuinely sensitive, move it behind Netlify
> Identity, Cloudflare Access, or a hosted service with real authentication.

`owner.html` is already excluded from the sitemap, tagged `noindex, nofollow`,
kept out of the nav, and disallowed in `robots.txt`.

---

## Swap in real photos

Right now the Spaces page uses CSS gradient tiles as placeholders. To use
real photographs:

1. Drop your images into `assets/img/` — e.g. `room.jpg`, `light.jpg`.
2. Resize them first. Aim for **1600px on the long edge** and save as JPEG at
   about 80% quality; anything larger just makes the page slow on mobile data.
3. In `spaces.html`, replace each placeholder:

   ```html
   <!-- before -->
   <div class="gal__art" role="img" aria-label="The main room…"></div>

   <!-- after -->
   <img class="gal__art" src="{{ '/assets/img/room.jpg' | relative_url }}"
        alt="The main room, with the bed and sofa under a wide east-facing window"
        loading="lazy" width="1600" height="1067">
   ```

4. Add this to `assets/css/main.css` so the photos fill their tiles:

   ```css
   img.gal__art { width: 100%; height: 100%; object-fit: cover; }
   ```

**Write real alt text.** Describe what is in the photo, not "studio photo".
Screen-reader users and Google both read it.

For the social-share preview, add a 1200×630 image at
`assets/img/og.jpg` and set `image: /assets/img/og.jpg` in `_config.yml`.

---

## Change the WhatsApp numbers

`_config.yml`, under `business.whatsapp`. Keep both formats:

```yaml
whatsapp:
  - label: "0716 628 950"        # what visitors see
    intl: "254716628950"         # what wa.me needs — no +, no spaces
```

Both numbers appear on the booking page, the contact page, the footer and
every CTA band. Each button opens one chat; nothing ever opens both at once.

---

## Test before launch

On a real phone, over mobile data, not just a desktop browser window:

- [ ] Hamburger menu opens, closes, and closes again after tapping a link
- [ ] Theme toggle switches and **survives a page reload**
- [ ] Calculator ruler drags smoothly; total updates; confetti fires at 4 hours
- [ ] "Lock it in on WhatsApp" carries your hours and add-ons to the booking page
- [ ] Both WhatsApp buttons open WhatsApp with the message filled in
- [ ] The booking message is readable in WhatsApp — check the emoji and line breaks
- [ ] FAQ items open and close
- [ ] Nothing scrolls sideways on a narrow screen
- [ ] `/owner.html` asks for the passphrase and is not reachable from the nav
- [ ] A made-up URL like `/nope.html` shows the 404 page
- [ ] Tab through each page — the focus ring is always visible

Then run the home page through [PageSpeed Insights](https://pagespeed.web.dev/)
and check it reads well in both light and dark mode.

---

## Project layout

```
_config.yml          Site settings, business details, both WhatsApp numbers
_data/               All content you'll actually edit — prices, add-ons, FAQ
_includes/           Header, footer, head, theme toggle, CTA band
_layouts/            default → page / home
assets/css/main.css  One stylesheet. Tokens at the top, both themes defined
assets/js/main.js    Pricing engine, calculator, nav, theme, booking message
owner.html           Private dashboard behind the SHA-256 gate
robots.txt           Keeps /owner.html out of search engines
```

The pricing engine in `main.js` mirrors `_data/pricing.yml` exactly and is
exposed as `window.ABS` so `owner.html` can reuse it without duplicating the
maths.

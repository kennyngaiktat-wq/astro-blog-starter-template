# Big Pharma Group: pharmacy website

This is an Astro site that runs on **Cloudflare Workers**, with a **D1** database. It covers:

- **Product catalogue.** Five categories, tags, search, and Thai/English.
- **Consultation-only medicines.** These are listed so customers know you stock them, but they can't be added to the cart. Customers are pointed to LINE or phone instead.
- **Cart and checkout.** Payment is through **Opn Payments**: PromptPay QR, Google Pay and cards. Customers can choose home delivery or pickup in store.
- **Member accounts.** Members get a 5% discount, a saved address and a preferred payment method.
- **Admin area** (`/admin`):
  - product search, inline price and stock editing, and bulk updates (tags, category, price %, consultation, show/hide)
  - CSV import and export (including the POS stock export)
  - customers and orders
  - shop settings and links (LINE, Shopee, Lazada)

## First deploy (one time)

1. **Connect the repo.** In the Cloudflare dashboard, go to **Workers & Pages → Create → Import a repository**. Pick this GitHub repo and keep the defaults:
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`

   The D1 database `big-pharma-db` is created automatically on the first deploy.
2. **Add secrets.** Open the Worker, then **Settings → Variables and Secrets**. Add each of these as type **Secret**:
   - `ADMIN_EMAIL`: your admin login email
   - `ADMIN_PASSWORD`: a long password
   - `OPN_PUBLIC_KEY`: `pkey_…` from the Opn dashboard
   - `OPN_SECRET_KEY`: `skey_…` from the Opn dashboard
   - `GOOGLEPAY_MERCHANT_ID`: optional, needed for live Google Pay

   Use the Opn **test** keys first and switch to the live keys when you're happy.
3. **Connect your domain.** Under **Settings → Domains & Routes → Add → Custom domain**, add `bigpharmagroup.com`, and `www.bigpharmagroup.com` if you want it.
4. **Load the products.** Open `https://bigpharmagroup.com/admin` and log in. Go to **Import / Export** and upload `products_import.csv`.
5. **Fill in your links.** In **Admin → Settings**, add your LINE, Shopee and Lazada links when you have them.
6. **Set up the Opn webhook.** In the Opn dashboard, go to **Webhooks** and add `https://bigpharmagroup.com/api/webhooks/opn`.

After this, every push to `main` redeploys the site automatically.

## Updating prices and stock

- **One product:** go to Admin → Products, search, change the price or stock in the table, then click **Save table edits**.
- **Many products:** go to Admin → Import / Export.
  - Download the CSV, edit it in Excel, and upload it again. Only the columns in the file are changed.
  - Or upload the POS stock export. In Excel, use *Save As → CSV UTF-8*. Cost and profit columns are ignored.

## Product images (optional)

You can paste an image link on each product. To upload images directly instead:

1. Create an R2 bucket.
2. Add it to `wrangler.json` as the binding `IMAGES`:

   ```json
   "r2_buckets": [{ "binding": "IMAGES", "bucket_name": "big-pharma-images" }]
   ```

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars   # set ADMIN_EMAIL / ADMIN_PASSWORD
npm run preview                  # http://localhost:8787
```

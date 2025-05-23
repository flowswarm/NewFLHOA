const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/scrape', async (req, res) => {
  let browser;

  try {
    // 1. Launch Puppeteer
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // 2. Go to home page
    await page.goto('https://www2.myfloridalicense.com', {
      waitUntil: 'domcontentloaded'
    });

    // 3. Click "Online Services"
    await page.evaluate(() => {
      const link = Array.from(document.querySelectorAll('a')).find(a =>
        a.innerText.includes('ONLINE SERVICES')
      );
      if (link) link.click();
    });

    await page.waitForNavigation();

    // 4. Scroll and click "Community Association Managers"
    let managerLink = null;
    for (let i = 0; i < 3; i++) {
      managerLink = await page.evaluateHandle(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links.find(a =>
          a.textContent.trim() === 'Community Association Managers'
        );
      });

      if (managerLink) {
        await managerLink.click();
        try {
          await page.waitForNavigation({ timeout: 5000 });
        } catch {}
        break;
      }
    }

    // 5. Expand "Licensee Files"
    await page.evaluate(() => {
      const toggle = document.querySelector('.collapse-toggle');
      if (toggle) toggle.click();
    });

    await page.waitForTimeout(1000);

    // 6. Find and click CSV download link
    const csvUrl = await page.evaluate(() => {
      const link = Array.from(document.querySelectorAll('a')).find(a =>
        a.textContent.includes('Community Association Managers File') &&
        a.href.endsWith('.csv')
      );
      return link ? link.href : null;
    });

    if (!csvUrl) throw new Error('CSV link not found.');

    // 7. Download CSV
    const viewSource = await page.goto(csvUrl);
    const buffer = await viewSource.buffer();

    await browser.close();

    res.setHeader('Content-Disposition', 'attachment; filename="hoa_roster.csv"');
    res.setHeader('Content-Type', 'text/csv');
    return res.send(buffer);

  } catch (err) {
    if (browser) await browser.close();
    res.status(500).send({ error: err.toString() });
  }
});

// Health check
app.get('/', (req, res) => {
  res.send('Puppeteer microservice is running');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

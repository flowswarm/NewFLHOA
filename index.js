const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/scrape', async (req, res) => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
    // Do not set executablePath manually – Puppeteer resolves it internally
  });

  const page = await browser.newPage();

  try {
    // Step 1: Go to homepage
    await page.goto('https://www2.myfloridalicense.com', {
      waitUntil: 'domcontentloaded',
    });

    // Step 2: Click "Online Services"
    await page.evaluate(() => {
      const link = Array.from(document.querySelectorAll('a')).find(a =>
        a.innerText.includes('ONLINE SERVICES')
      );
      if (link) link.click();
    });

    await page.waitForNavigation();

    // Step 3: Click "Community Association Managers"
    let managerLink = null;
    for (let i = 0; i < 3; i++) {
      managerLink = await page.evaluateHandle(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links.find(a => a.textContent.trim() === 'Community Association Managers');
      });
      if (managerLink) {
        await managerLink.click();
        await page.waitForNavigation({ timeout: 5000 }).catch(() => {});
        break;
      }
    }

    // Step 4: Expand "Licensee Files"
    await page.evaluate(() => {
      const toggle = document.querySelector('.collapse-toggle');
      if (toggle) toggle.click();
    });

    await page.waitForTimeout(1000);

    // Step 5: Click the CSV link
    const csvUrl = await page.evaluate(() => {
      const link = Array.from(document.querySelectorAll('a')).find(a =>
        a.textContent.includes('Community Association Managers File') && a.href.endsWith('.csv')
      );
      return link ? link.href : null;
    });

    if (!csvUrl) throw new Error('CSV link not found.');

    // Step 6: Download CSV
    const viewSource = await page.goto(csvUrl);
    const buffer = await viewSource.buffer();

    await browser.close();
    res.setHeader('Content-Disposition', 'attachment; filename="hoa_roster.csv"');
    res.setHeader('Content-Type', 'text/csv');
    return res.send(buffer);

  } catch (err) {
    await browser.close();
    res.status(500).send({ error: err.toString() });
  }
});

app.get('/', (_, res) => {
  res.send('Puppeteer microservice is running');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

import { Hyperbrowser } from '@hyperbrowser/sdk';
import puppeteer from 'puppeteer-core';

// Ensure this is not used on the client-side
if (typeof window !== 'undefined') {
  throw new Error('Hyperbrowser utilities can only be used on the server.');
}

const hyperbrowser = new Hyperbrowser({
  apiKey: process.env.HYPERBROWSER_API_KEY || '',
});

export interface BrowserSession {
  browser: any;
  page: any;
  sessionId: string;
}

/**
 * Creates a new headless browser session using Hyperbrowser.
 */
export async function createBrowserSession(): Promise<BrowserSession> {
  console.log('[Hyperbrowser] Creating new session...');
  try {
    const session = await hyperbrowser.sessions.create();
    
    // Connect puppeteer to the Hyperbrowser websocket endpoint
    const browser = await puppeteer.connect({
      browserWSEndpoint: session.wsEndpoint,
      defaultViewport: null,
    });

    const page = await browser.newPage();

    console.log(`[Hyperbrowser] Session created successfully (ID: ${session.id})`);
    
    return {
      browser,
      page,
      sessionId: session.id,
    };
  } catch (error) {
    console.error('[Hyperbrowser] Error creating session:', error);
    throw new Error('Failed to create browser session.');
  }
}

/**
 * Navigates a page to a specific URL with error handling and timeouts.
 */
export async function navigateTo(page: any, url: string, timeoutMs: number = 30000): Promise<void> {
  console.log(`[Hyperbrowser] Navigating to ${url}...`);
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: timeoutMs });
    console.log(`[Hyperbrowser] Navigation successful.`);
  } catch (error) {
    console.error(`[Hyperbrowser] Error navigating to ${url}:`, error);
    throw new Error(`Navigation failed: ${url}`);
  }
}

/**
 * Takes a screenshot of a specific element or the full page.
 * If selector is omitted, takes a screenshot of the entire visible page.
 */
export async function takeScreenshot(page: any, filename: string, selector?: string): Promise<void> {
  console.log(`[Hyperbrowser] Capturing screenshot: ${filename} ${selector ? `of element ${selector}` : ''}`);
  try {
    if (selector) {
      await page.waitForSelector(selector, { timeout: 10000 });
      const element = await page.$(selector);
      if (element) {
        await element.screenshot({ path: filename });
        console.log(`[Hyperbrowser] Screenshot saved to ${filename}`);
      } else {
        throw new Error(`Element not found for selector: ${selector}`);
      }
    } else {
      await page.screenshot({ path: filename, fullPage: true });
      console.log(`[Hyperbrowser] Screenshot saved to ${filename}`);
    }
  } catch (error) {
    console.error(`[Hyperbrowser] Error taking screenshot:`, error);
    throw new Error('Failed to capture screenshot');
  }
}

/**
 * Scrapes Basescan for a specific transaction hash block status.
 * Example of headless interaction.
 */
export async function scrapeBasescan(txHash: string): Promise<{ status: string, isSuccess: boolean }> {
  console.log(`[Hyperbrowser] Scraping Basescan for TX: ${txHash}...`);
  let session: BrowserSession | null = null;
  
  try {
    session = await createBrowserSession();
    const { page } = session;

    // Navigate to Basescan tx page
    await navigateTo(page, `https://sepolia.basescan.org/tx/${txHash}`, 45000);

    // Wait for the status badge to appear
    await page.waitForSelector('#ContentPlaceHolder1_maintable', { timeout: 15000 });

    // Scrape the status text
    const statusText = await page.evaluate(() => {
      // Find the element containing status. The exact selector might change, 
      // but usually it's within a span with class matching 'status' or text containing 'Success'/'Fail'.
      const statusElement = document.querySelector('#ContentPlaceHolder1_maintable .badge');
      return statusElement ? statusElement.textContent?.trim() || 'Unknown' : 'Unknown';
    });

    const isSuccess = statusText.toLowerCase().includes('success');
    console.log(`[Hyperbrowser] TX ${txHash} status: ${statusText}`);

    return {
      status: statusText,
      isSuccess,
    };
  } catch (error) {
    console.error(`[Hyperbrowser] Scraping error base scan:`, error);
    throw error;
  } finally {
    if (session) {
      console.log(`[Hyperbrowser] Cleaning up session ${session.sessionId}...`);
      await session.browser.close();
    }
  }
}

/**
 * Example function to simulate wallet connection testing
 */
export async function simulateWalletConnect(): Promise<void> {
  console.log('[Hyperbrowser] Simulating Wallet Connect flow...');
  let session: BrowserSession | null = null;
  
  try {
    session = await createBrowserSession();
    const { page } = session;

    // Go to basedare MVP locally or production
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    await navigateTo(page, appUrl);

    // Take screenshot of landing page
    await takeScreenshot(page, './artifacts/landing-page-test.png');

    // Emulate clicking on connect wallet. 
    // This is purely visual emulation unless a wallet extension is loaded into the core.
    // Example: Click generic 'Connect Wallet' button class or id.
    // await page.click('.rainbow-connect-btn');
    // await page.waitForTimeout(2000);

    console.log('[Hyperbrowser] Wallet connect simulation step reached.');

  } catch (error) {
    console.error('[Hyperbrowser] Wallet connect simulation failed:', error);
    throw error;
  } finally {
    if (session) {
      await session.browser.close();
    }
  }
}

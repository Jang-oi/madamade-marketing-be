import {createRequire} from 'module';

const require = createRequire(import.meta.url);

const puppeteer = require("puppeteer");
/**
 * url을 받아서 크롤링을위해 크롬 오픈하는 함수
 * @param url
 * @returns {Promise<*>}
 */
export const chromeOpen = async (url) => {
    const browser = await puppeteer.launch({headless: 'new'});
    const page = await browser.newPage();
    await page.setViewport({width: 1920, height: 1080});
    await page.setExtraHTTPHeaders(headerOptions);
    await page.goto(url);
    // await page.type('.devsite-search-field', 'automate beyond recorder');
/*    await page.setRequestInterception(true);

    page.on('request', (req) => {
        if (req.resourceType() === 'image' ||
            req.resourceType() === 'font' ||
            req.resourceType() === 'stylesheet') {

            req.abort(); // 거부
        } else {
            req.continue(); // 수락
        }
    });*/

    return {browser, page};
}

export const headerOptions = {
    'User-Agent'     : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Whale/3.24.223.21 Safari/537.36',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept'         : 'application/json, text/plain, */*',
    'Content-Type'   : 'application/json',
}
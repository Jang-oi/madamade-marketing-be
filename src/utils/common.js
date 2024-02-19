import {createRequire} from 'module';
import fs from "fs";
import path from "path";
import axios from "axios";

const require = createRequire(import.meta.url);
const __dirname = path.resolve();
const puppeteer = require("puppeteer");
const { exec } = require('child_process');

export const isDev = process.env.NODE_ENV === 'development';
export const defaultPath = isDev ? `${__dirname}` : `${__dirname}/resources/app`;

export const chromePath = `${defaultPath}/chrome.txt`;
export const licensePath = `${defaultPath}/license.txt`;
/**
 * url을 받아서 크롤링을위해 크롬 오픈하는 함수
 * @param url
 * @returns {Promise<*>}
 */
export const chromeOpen = async (url) => {
    const executablePath = fs.readFileSync(chromePath, 'utf-8') || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

    const browser = await puppeteer.launch({
        headless: 'new',
        executablePath
    });
    const page = await browser.newPage();
    await page.setViewport({width: 1920, height: 1080});
    await page.setExtraHTTPHeaders(headerOptions);
    await page.goto(url);

    return {browser, page};
}

export const notepadOpen = (filePath) => {
    exec(`notepad.exe ${filePath}`);
}

export const getNumberKoreanDate = async () => {
    const response = await axios.get('https://worldtimeapi.org/api/timezone/Asia/Seoul');
    return Number(response.data.datetime.split('T')[0].replace(/-/g, ''));
}

export const headerOptions = {
    'User-Agent'     : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Whale/3.24.223.21 Safari/537.36',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept'         : 'application/json, text/plain, */*',
    'Content-Type'   : 'application/json',
}
import {chromeOpen, headerOptions} from "../../utils/common.js";
import axios from "axios";

import {createRequire} from 'module';

const require = createRequire(import.meta.url);
const CryptoJS = require('crypto-js');

// 광고 API
const accessKey = "0100000000138bb119fcc9beff61b42d84302bec7765ec74f10c27be2c9a6337a4a2f8abbc";
const secretKey = "AQAAAAATi7EZ/Mm+/2G0LYQwK+x3+bCPHlYe3Bme9Ma/tuVjwQ==";
const customerId = '1128231';

// 검색 API
const clientId = 'XvWnquFEu1tD8y8OVTae';
const clientSecret = 'BsaLLa2qSU';

export default {
    getKeyword: async ({mallProductUrl}) => {
        const defaultResponseData = {
            returnCode: 1,
            data      : [],
            returnMsg : ''
        };
        const {browser, page} = await chromeOpen(mallProductUrl);
        try {
            const keywordArray = await page.evaluate(() => {
                return document.querySelector("head > meta:nth-child(6)").content.split(',').filter(data => data);
            });
            const method = "GET";
            const api_url = "/keywordstool";
            const timestamp = Date.now() + '';

            const hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, secretKey);
            hmac.update(`${timestamp}.${method}.${api_url}`);
            const hash = hmac.finalize();
            const signature = hash.toString(CryptoJS.enc.Base64);

            // 키워드는 네이버 광고를 쓰고있어야 가능
            const keywordOptions = {
                headers: {
                    'X-Timestamp' : timestamp,
                    'X-API-KEY'   : accessKey,
                    'X-API-SECRET': secretKey,
                    'X-CUSTOMER'  : customerId,
                    'X-Signature' : signature,
                    ...headerOptions
                }
            };

            // 네이버 검색API clientId 를 일단 내 계정으로 만들었는데 앞단에서 요청할 일은 없을거 같으니까
            const searchOptions = {
                headers: {
                    'X-Naver-Client-Id'    : clientId,
                    'X-Naver-Client-Secret': clientSecret,
                    ...headerOptions
                }
            };

            function chunkArray(array, size) {
                const chunkedArray = [];
                for (let i = 0; i < array.length; i += size) {
                    const chunk = array.slice(i, i + size);
                    chunkedArray.push(chunk.join(','));
                }
                return chunkedArray;
            }

            const keywordTagArray = chunkArray(keywordArray, 5);
            if (keywordTagArray.length === 0) return {...defaultResponseData, returnMsg: '키워드가 존재하지 않습니다.'};
            for (let i = 0; i < 1; i++) {
                const keywordUrl = `https://api.naver.com/keywordstool?hintKeywords=${encodeURI(keywordTagArray[i])}&showDetail=1`;
                const keywordResponse = await axios.get(keywordUrl, keywordOptions);
                const keywords = keywordResponse.data.keywordList.filter(keywordItem => keywordTagArray[i].split(',').some(tagItem => tagItem === keywordItem.relKeyword));
                for (let j = 0; j < keywords.length; j++) {
                    const keyword = keywords[j];
                    // 10 이하일 때 텍스트로 나오는 경우 있어서 강제로 10 넣음.
                    if (typeof keyword['monthlyPcQcCnt'] !== "number") keyword['monthlyPcQcCnt'] = 10;
                    if (typeof keyword['monthlyMobileQcCnt'] !== "number") keyword['monthlyMobileQcCnt'] = 10;
                    // 키워드에 등록된 총 상품수 가져오기
                    const searchUrl = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURI(keyword['relKeyword'])}&display=1`
                    const keywordSearchResponse = await axios.get(searchUrl, searchOptions);
                    keyword['total'] = keywordSearchResponse.data.total;
                    // 총 검색수
                    keyword['clkCntSum'] = keyword['monthlyMobileQcCnt'] + keyword['monthlyPcQcCnt'];
                    defaultResponseData.data.push(keyword);
                }
            }

            return {...defaultResponseData, returnMsg: '정상적으로 조회 되었습니다.'};
        } catch (e) {
            console.log(e);
            return {
                ...defaultResponseData,
                returnMsg : 'Naver 키워드 서비스가 정상적이지 않습니다.\n잠시 후에 이용 부탁드리겠습니다.',
                returnCode: -1
            };
        } finally {
            await browser.close();
        }
    }
}
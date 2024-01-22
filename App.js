const axios = require('axios');
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());
// 크롤링 
const {Builder, By} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

// 키워드
const CryptoJS = require('crypto-js');
const accessKey = "0100000000138bb119fcc9beff61b42d84302bec7765ec74f10c27be2c9a6337a4a2f8abbc";
const secretKey = "AQAAAAATi7EZ/Mm+/2G0LYQwK+x3+bCPHlYe3Bme9Ma/tuVjwQ==";
const customerId = '1128231';

// 검색 API
const clientId = 'XvWnquFEu1tD8y8OVTae';
const clientSecret = 'BsaLLa2qSU';

const BASE_URL = '/mada/api/v1';
app.listen(3001, () => {
    console.log('서버 시작');
});

/**
 * url을 받아서 크롤링을위해 크롬 오픈하는 함수
 * @param url
 * @returns {Promise<*>}
 */
const chromeOpen = async (url) => {

    let chromeOptions = new chrome.Options();
    chromeOptions.addArguments("--window-size=1920,1080")
    chromeOptions.addArguments("--disable-extensions")
    chromeOptions.addArguments("--proxy-server='direct://'")
    chromeOptions.addArguments("--proxy-bypass-list=*")
    chromeOptions.addArguments("--start-maximized")
    chromeOptions.addArguments('--headless')
    chromeOptions.addArguments('--disable-gpu')
    chromeOptions.addArguments('--disable-dev-shm-usage')
    chromeOptions.addArguments('--no-sandbox')
    chromeOptions.addArguments('--ignore-certificate-errors')


    let driver = await new Builder().forBrowser('chrome')
        .setChromeOptions(chromeOptions)
        .build();
    // await driver.manage().setTimeouts({
    //     implicit: 10000, // 10초
    //     pageLoad: 30000, // 30초
    //     script: 30000, // 30초
    // });

    await driver.get(url);

    return driver;
}

app.post(`${BASE_URL}/getShoppingList`, async (req, res) => {

    getShoppingList(req.body)
        .then(response =>
            res.send({response}))
        .catch(err => {
            res.send({
                returnCode: 0,
                data      : [],
                returnMsg : err
            })
        });
});

const getShoppingList = async ({searchValue}) => {

    const encodeValue = encodeURI(searchValue);
    const searchUrl = `https://search.shopping.naver.com/search/all?adQuery=${encodeValue}&exagency=true&exrental=true&exused=true&frm=NVSCTAB&npayType=2&origQuery=${encodeValue}&pagingIndex=1&pagingSize=20&productSet=checkout&query=${encodeValue}&sort=review_rel&timestamp=&viewType=list`;
    const driver = await chromeOpen(searchUrl);
    const responseData = {
        returnCode: 0,
        data      : [],
        returnMsg : ''
    };
    try {
        // 클래스 존재 여부 확인
        const isNoResultClassExist = await driver.findElements(By.className('noResultWithBestResults_no_keyword___Jhtn'));

        if (isNoResultClassExist.length > 0) {
            responseData.returnCode = -1;
            responseData.returnMsg = '검색 결과가 없습니다.'
            return responseData;
        }

        // __NEXT_DATA__ 스크립트 태그 가져오기
        const nextDataScript = await driver.findElement(By.id('__NEXT_DATA__'));
        // 스크립트 태그 내용 가져오기
        const nextDataContent = await nextDataScript.getAttribute('textContent');

        if (nextDataContent) {
            const dataArray = JSON.parse(nextDataContent)?.props?.pageProps?.initialState?.products.list;
            for (let i = 0; i < dataArray.length; i++) responseData.data.push(dataArray[i].item);
        }

        responseData.returnMsg = '정상적으로 조회 되었습니다.';
        return responseData;
    } catch (e) {
        responseData.returnCode = -1;
        responseData.returnMsg = e.message;
        return responseData;
    } finally {
        await driver.quit();
    }
}

const getKeywordShoppingRate = async (searchValue, productTitle) => {

    const encodeValue = encodeURI(searchValue);
    const searchUrl = `https://search.shopping.naver.com/search/all?adQuery=${encodeValue}&exagency=true&exrental=true&exused=true&frm=NVSCTAB&npayType=2&origQuery=${encodeValue}&pagingIndex=1&pagingSize=20&productSet=checkout&query=${encodeValue}&sort=review_rel&timestamp=&viewType=list`;
    const driver = await chromeOpen(searchUrl);
    let responseRate = 0;
    try {
        // 클래스 존재 여부 확인
        const isNoResultClassExist = await driver.findElements(By.className('noResultWithBestResults_no_keyword___Jhtn'));
        if (isNoResultClassExist.length > 0) return '검색 결과 없음';

        const nextDataScript = await driver.findElement(By.id('__NEXT_DATA__'));
        const nextDataContent = await nextDataScript.getAttribute('textContent');

        if (nextDataContent) {
            const dataArray = JSON.parse(nextDataContent)?.props?.pageProps?.initialState?.products.list;
            for (let i = 0; i < dataArray.length; i++) {
                if (productTitle === dataArray[i].item.productTitle) {
                    responseRate = i + 1;
                    break;
                }
            }
        }

        return responseRate;
    } catch (e) {
        return e.message;
    } finally {
        await driver.quit();
    }
}

app.post('/mada/api/v1/getkeyword', async function (req, res) {
    console.log(req.body);
    getKeywords(req.body).then(response =>
        res.send({response}))
        .catch((err) => {
            res.send({
                returnCode: 0,
                data      : [],
                returnMsg : err
            });
        });
});

const getKeywords = async ({mallProductUrl, productTitle}) => {
    const driver = await chromeOpen(mallProductUrl);
    // 키워드 담긴 배열
    try {
        const keywordArray = await driver.executeScript(`return document.querySelector("head > meta:nth-child(6)").content.split(',').filter((data) =>{return data})`);
        let resultArr = [];
        const method = "GET";
        const api_url = "/keywordstool";
        const timestamp = Date.now() + '';

        const hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, secretKey);
        hmac.update(`${timestamp}.${method}.${api_url}`);
        const hash = hmac.finalize();
        const signature = hash.toString(CryptoJS.enc.Base64);

        // 키워드는 네이버 광고를 쓰고있어야 가능
        // 친구 회사 키값으로 계속 하면댈듯
        const keywordOptions = {
            headers: {
                'X-Timestamp' : timestamp,
                'X-API-KEY'   : accessKey,
                'X-API-SECRET': secretKey,
                'X-CUSTOMER'  : customerId,
                'X-Signature' : signature
            }
        };

        // 네이버 검색API clientId 를 일단 내 계정으로 만들었는데 앞단에서 요청할 일은 없을거 같으니까
        // 너 아이디로 네이버개발자 드가서 만들어야 할듯
        const searchOptions = {
            headers: {
                'X-Naver-Client-Id'    : clientId,
                'X-Naver-Client-Secret': clientSecret,
            }
        };

        // 5개 이하만 호출되서 걍 5개만 보게하려고 해놈
        // const keywordLength = (keywordArray.length > 5) ? 5 : keywordArray.length;
        const keywordLength = (keywordArray.length > 5) ? 5 : keywordArray.length;
        for (let i = 0; i < keywordLength; i++) {
            const keywordUrl = `https://api.naver.com/keywordstool?hintKeywords=${encodeURI(keywordArray[i])}&showDetail=1`
            const searchUrl = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURI(keywordArray[i])}&display=1`

            await axios.get(keywordUrl, keywordOptions).then(async response => {
                const keyword = response.data.keywordList.filter(keywordData => keywordData.relKeyword === keywordArray[i])
                const resultKeyword = keyword[0];

                // 키워드에 등록된 총 상품수 가져오기
                await axios.get(searchUrl, searchOptions).then(res => resultKeyword['total'] = res.data.total);

                // 10 이하일 때 텍스트로 나오는 경우 있어서 강제로 10 넣음. 다른경우는 없는지 확인해봐야할듯 ?
                if (typeof resultKeyword['monthlyPcQcCnt'] !== "number") resultKeyword['monthlyPcQcCnt'] = 10;
                if (typeof resultKeyword['monthlyMobileQcCnt'] !== "number") resultKeyword['monthlyMobileQcCnt'] = 10;

                // 총 검색수
                resultKeyword['clkCntSum'] = resultKeyword['monthlyMobileQcCnt'] + resultKeyword['monthlyPcQcCnt'];
                // 경쟁강도 계산 용도
                resultKeyword['compIdx'] = (resultKeyword['total'] / resultKeyword['clkCntSum']) * 0.01;
                resultKeyword['keywordRate'] = await getKeywordShoppingRate(keywordArray[i], productTitle);
                resultArr.push(resultKeyword);
            });
        }
        await driver.quit();

        return {
            returnCode: 1,
            data      : resultArr,
            returnMsg : '키워드가 정상적으로 조회되었습니다.'
        }
    } catch (e) {
        return {
            returnCode: -1,
            data      : [],
            returnMsg : 'Naver 키워드 서비스가 정상적이지 않습니다.\n잠시 후에 이용 부탁드리겠습니다.'
        }
    }
}

/**
 * 등록일자 가져옴.
 */

app.post('/mada/api/v1/getreview', (req, res) => {
    getReview(req.body).then(response =>
        res.send({response}))
        .catch((err) => {
            res.send({
                returnCode: 0,
                data      : [],
                returnMsg : err
            });
        });
});

/**
 * naver에서 해당 상품에 대한 리뷰 전체 조회하여 새로운 배열로 리턴
 * @param reviewCount
 * @param merchantNo
 * @param originProductNo
 * @returns {Promise<{returnCode: number, returnMsg: string, data: any[]}>}
 */
const getReviewArr = async (reviewCount, merchantNo, originProductNo) => {
    if (reviewCount > 200) reviewCount = 199;
    try {
        const returnArrMap = new Map();
        let productOptionContentDisplay = true;
        const requests = Array.from({length: reviewCount}, (_, i) => i + 1).map(async (i) => {
            const url = `https://smartstore.naver.com/i/v1/contents/reviews/query-pages`;
            const response = await axios.post(url, {
                page                : i,
                pageSize            : 20,
                checkoutMerchantNo  : merchantNo,
                originProductNo     : originProductNo,
                reviewSearchSortType: 'REVIEW_CREATE_DATE_DESC'
            });

            const contents = response.data.contents;

            for (let j = 0; j < contents.length; j++) {
                productOptionContentDisplay = true;
                if (!contents[j].productOptionContent) {
                    productOptionContentDisplay = false;
                    continue;
                }

                const key = contents[j].productOptionContent;
                if (returnArrMap.has(key)) {
                    const item = returnArrMap.get(key);
                    item.cnt++;
                    item.reviewScore += Number(contents[j].reviewScore);
                } else {
                    returnArrMap.set(key, {
                        productOptionContent: key,
                        cnt                 : 1,
                        reviewScore         : Number(contents[j].reviewScore)
                    });
                }
            }
        });

        await Promise.all(requests);
        return {
            returnCode: productOptionContentDisplay ? 1 : -1,
            data      : Array.from(returnArrMap.values()).sort((a, b) => b.cnt - a.cnt),
            returnMsg : productOptionContentDisplay ? '리뷰가 정상적으로 조회되었습니다.' : '리뷰 옵션이 보이지 않는 상품입니다.'
        }
    } catch (e) {
        return {
            returnCode: -1,
            data      : [],
            returnMsg : 'Naver 리뷰 서비스가 정상적이지 않습니다.\n잠시 후에 이용 부탁드리겠습니다.'
        }
    }

}

/**
 * naver 쇼핑 사이트 접속하여 리뷰 크롤링
 * @param url
 * @returns {Promise<{returnCode: number, returnMsg: string, data: *[]}>}
 */
const getReview = async ({mallProductUrl, reviewCount, originalMallProductId}) => {
    const driver = await chromeOpen(mallProductUrl);
    // __PRELOADED_STATE__ 를 window 객체에 넣고 그 안에 상품에 대한 정보를 담고 있음.
    // const originProductNo = await driver.executeScript(`return __PRELOADED_STATE__.product.A.productNo`);
    // originalMallProductId
    const merchantNo = await driver.executeScript(`return __PRELOADED_STATE__.product.A.channel.naverPaySellerNo`);
    // const reviewCount = await driver.executeScript(`return __PRELOADED_STATE__.product.A.reviewAmount.totalReviewCount`);
    //
    await driver.quit();

    return await getReviewArr(Math.ceil(reviewCount / 20), merchantNo, originalMallProductId);
}
const axios = require('axios');
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());
// 크롤링 
const {Builder, By, until, Key} = require('selenium-webdriver');
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
    // chromeOptions.addArguments('--headless')
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
        const productTotalEl = await driver.findElement(By.className('subFilter_num__S9sle'));
        const productTotal = await productTotalEl.getText();
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

        return {responseRate, productTotal};
    } catch (e) {
        return e.message;
    } finally {
        await driver.quit();
    }
}

app.post('/mada/api/v1/getkeyword', async function (req, res) {
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

        // 5개 이하만 호출되서 걍 5개만 보게하려고 해놈
        // const keywordLength = (keywordArray.length > 5) ? 5 : keywordArray.length;
        const keywordLength = (keywordArray.length > 5) ? 5 : keywordArray.length;
        for (let i = 0; i < keywordLength; i++) {
            const keywordUrl = `https://api.naver.com/keywordstool?hintKeywords=${encodeURI(keywordArray[i])}&showDetail=1`

            const keywordResponse = await axios.get(keywordUrl, keywordOptions);
            const keyword = keywordResponse.data.keywordList.filter(keywordData => keywordData.relKeyword === keywordArray[i])[0];
            // 10 이하일 때 텍스트로 나오는 경우 있어서 강제로 10 넣음.
            if (typeof keyword['monthlyPcQcCnt'] !== "number") keyword['monthlyPcQcCnt'] = 10;
            if (typeof keyword['monthlyMobileQcCnt'] !== "number") keyword['monthlyMobileQcCnt'] = 10;

            // 총 검색수
            keyword['clkCntSum'] = keyword['monthlyMobileQcCnt'] + keyword['monthlyPcQcCnt'];
            const {responseRate, productTotal} = await getKeywordShoppingRate(keywordArray[i], productTitle);
            keyword['keywordRate'] = responseRate;
            keyword['total'] = productTotal;
            resultArr.push(keyword);
        }

        return {
            returnCode: 1,
            data      : resultArr,
            returnMsg : '키워드가 정상적으로 조회되었습니다.'
        }
    } catch (e) {
        console.log(e.message);
        return {
            returnCode: -1,
            data      : [],
            returnMsg : 'Naver 키워드 서비스가 정상적이지 않습니다.\n잠시 후에 이용 부탁드리겠습니다.'
        }
    } finally {
        await driver.quit();
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
        console.log(e.message);
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
const getReview = async ({mallProductUrl}) => {
    const driver = await chromeOpen(mallProductUrl);
    // __PRELOADED_STATE__ 를 window 객체에 넣고 그 안에 상품에 대한 정보를 담고 있음.
    // const originProductNo = await driver.executeScript(`return __PRELOADED_STATE__.product.A.productNo`);
    // originalMallProductId
    try {
        await driver.sleep(500);
        const aTagElement = await driver.findElement(By.css('a[href="#REVIEW"]'));
        await aTagElement.click();

        await driver.sleep(500);
        const returnArrMap = new Map();
        while(true) {
            // _3HKlxxt8Ii 클래스를 찾아 크롤링 진행
            const nextButtonElement = await driver.findElement(By.className('_2Ar8-aEUTq'));
            const ariaHiddenValue = await nextButtonElement.getAttribute('aria-hidden');
            if (ariaHiddenValue === 'true') break;
            const reviewTableElements = await driver.findElements(By.className('_3i1mVq_JBd'));
            // reviewTableElements 활용하여 크롤링 로직을 진행합니다.
            for (const reviewElement of reviewTableElements) {
                const reviewCount = await reviewElement.findElement(By.tagName('em')).getText();
                const optionText = await reviewElement.findElement(By.className('_2FXNMst_ak')).getText();

                const optionKey = optionText.split('\n')[0];
                if (returnArrMap.has(optionKey)) {
                    const item = returnArrMap.get(optionKey);
                    item.cnt++;
                    item.reviewCount += Number(reviewCount);
                } else {
                    returnArrMap.set(optionKey, {
                        optionKey,
                        reviewCount : Number(reviewCount),
                        cnt: 1,
                    });
                }
            }
            await nextButtonElement.click();
            await driver.sleep(500);
        }

        return {
            returnCode: 1,
            data      : Array.from(returnArrMap.values()).sort((a, b) => b.cnt - a.cnt),
            returnMsg : '리뷰가 정상적으로 조회되었습니다.'
        }
    } catch (e) {
        console.log(e.message);
        return {
            returnCode: -1,
            data      : [],
            returnMsg : 'Naver 리뷰 서비스가 정상적이지 않습니다.\n잠시 후에 이용 부탁드리겠습니다.'
        }
    } finally {
        await driver.quit();
    }

}
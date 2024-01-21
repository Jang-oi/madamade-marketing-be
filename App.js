const axios = require('axios');
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());
// 크롤링 
const {Builder, Key, By, until} = require('selenium-webdriver');
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

const getShoppingList = async ({searchValue, pagingIndex}) => {

    const encodeValue = encodeURI(searchValue);
    const searchUrl = `https://search.shopping.naver.com/search/all?adQuery=${encodeValue}&exagency=true&exrental=true&exused=true&frm=NVSCTAB&npayType=2&origQuery=${encodeValue}&pagingIndex=${pagingIndex}&pagingSize=20&productSet=checkout&query=${encodeValue}&sort=review_rel&timestamp=&viewType=list`;
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
        let href, thumbnailImageSrc, title, price, deliveryPrice,
            reviewCount, purchaseCount, registrationDate, zzimCount

        // responseData.data.push({
        //     href,
        //     thumbnailImageSrc,
        //     title,
        //     price,
        //     deliveryPrice   : deliveryPrice.replace("배송비\n", ""),
        //     reviewCount,
        //     purchaseCount,
        //     registrationDate: registrationDate.replace("등록일 ", ""),
        //     zzimCount
        // });
        responseData.returnMsg = '정상적으로 조회 되었습니다.';
        // }
        return responseData;
    } catch (e) {
        responseData.returnCode = -1;
        responseData.returnMsg = e.message;
        return responseData;
    } finally {
        await driver.quit();
    }
}


app.post('/mada/api/v1/getkeyword', async function (req, res) {
    getKeywords(req.body.url).then((response) => {
        res.send({
            returnCode: 1,
            data      : response,
            returnMsg : '키워드 테스트'
        });
    }).catch(() => {
        res.send({
            returnCode: 0,
            data      : [],
            returnMsg : '키워드 테스트'
        });
    });
});

const getKeywords = async (url) => {
    const driver = await chromeOpen(url);
    // 키워드 담긴 배열
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
            resultArr.push(resultKeyword);
        });
    }
    await driver.quit();
    return resultArr;
}

/**
 * 등록일자 가져옴.
 */
/*app.post('/mada/api/v1/getproductdate', (req, res) => {
    getProductDate(req.body.url).then((response) => {
        res.send({
            returnCode: 1,
            data      : response,
            returnMsg : '등록일자 테스트'
        });
    }).catch(() => {
        res.send({
            returnCode: 0,
            data      : [],
            returnMsg : '등록일자 테스트'
        });
    });
});

const getProductDate = async (url) => {
    const driver = await chromeOpen(url);
    let resultObj;
    // 상품에 대한 정보 담겨있음
    const productObj = await driver.executeScript(`return __PRELOADED_STATE__.product.A`);
    if (!productObj.id) {
        await driver.quit();
        resultObj = {
            test: '상품이 존재하지 않습니다.'
        }
        return resultObj;
    }
    resultObj = await getProductObj(productObj);
    await driver.quit();
    return resultObj;
}*/

/*const getProductObj = async (productObj) => {
    return {
        productId   : productObj.id,
        reviewAmount: productObj.reviewAmount,
        saleAmount  : productObj.saleAmount,
        thumbnail   : productObj.representImage.url,
        regDate     : new Date(productObj.regDate).toLocaleDateString(),
        delivery    : productObj.productDeliveryLeadTimes || [],
        images      : productObj.productImages || [],
    }
};*/

app.post('/mada/api/v1/getreview', (req, res) => {
    getReview(req.body.url).then((response) => {
        res.send({
            returnCode: 1,
            data      : response,
            returnMsg : '리뷰 테스트'
        });
    }).catch(() => {
        res.send({
            returnCode: 0,
            data      : [],
            returnMsg : '리뷰 테스트'
        });
    });
});

/**
 * naver에서 해당 상품에 대한 리뷰 전체 조회하여 새로운 배열로 리턴
 * @param reviewCount
 * @param merchantNo
 * @param originProductNo
 * @returns {Promise<*[]>}
 */
const getReviewArr = async (reviewCount, merchantNo, originProductNo) => {
    if (reviewCount > 200) reviewCount = 199;
    const returnArrMap = new Map();

    const requests = Array.from({length: reviewCount}, (_, i) => i + 1).map(async (i) => {
        const url = `https://smartstore.naver.com/i/v1/reviews/paged-reviews`;

        const response = await axios.post(url, {
            page           : i,
            pageSize       : 30,
            merchantNo     : merchantNo,
            originProductNo: originProductNo,
            sortType       : 'REVIEW_CREATE_DATE_DESC'
        });

        const contents = response.data.contents;

        for (let j = 0; j < contents.length; j++) {
            if (!contents[j].productOptionContent) continue;

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
    return Array.from(returnArrMap.values()).sort((a, b) => b.cnt - a.cnt);
}

/**
 * naver 쇼핑 사이트 접속하여 리뷰 크롤링
 * @param url
 * @returns {Promise<*[]>}
 */
const getReview = async (url) => {
    const driver = await chromeOpen(url);
    // __PRELOADED_STATE__ 를 window 객체에 넣고 그 안에 상품에 대한 정보를 담고 있음.
    const originProductNo = await driver.executeScript(`return __PRELOADED_STATE__.product.A.productNo`);
    // originalMallProductId
    const merchantNo = await driver.executeScript(`return __PRELOADED_STATE__.product.A.channel.naverPaySellerNo`);
    const reviewCount = await driver.executeScript(`return __PRELOADED_STATE__.product.A.reviewAmount.totalReviewCount`);
    await driver.quit();

    return await getReviewArr(Math.ceil(reviewCount / 30), merchantNo, originProductNo);
}
const axios = require('axios');
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());
// 크롤링 
const {Builder} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

// 키워드
const CryptoJS = require('crypto-js');
const accessKey = "0100000000138bb119fcc9beff61b42d84302bec7765ec74f10c27be2c9a6337a4a2f8abbc";
const secretKey = "AQAAAAATi7EZ/Mm+/2G0LYQwK+x3+bCPHlYe3Bme9Ma/tuVjwQ==";
const customerId = '1128231';

// 검색 API
const clientId = '2Iz2geTyL3MntmUyYLdT';
const clientSecret = '34k2jAsDQu';

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
    chromeOptions.addArguments('--blink-settings=imagesEnabled=false');
    chromeOptions.addArguments('--headless');
    chromeOptions.addArguments('--no-sandbox');
    chromeOptions.addArguments("--disable-popup-blocking");
    chromeOptions.addArguments("--disable-gpu");
    chromeOptions.addArguments("--disable-default-apps");
    chromeOptions.addArguments("--disable-infobars");

    let driver = await new Builder().forBrowser('chrome')
        .setChromeOptions(chromeOptions)
        .build();
    await driver.get(url);

    return driver;
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
app.post('/mada/api/v1/getproductdate', (req, res) => {
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
}

const getProductObj = async (productObj) => {
    return {
        productId   : productObj.id,
        reviewAmount: productObj.reviewAmount,
        saleAmount  : productObj.saleAmount,
        thumbnail   : productObj.representImage.url,
        regDate     : new Date(productObj.regDate).toLocaleDateString(),
        delivery    : productObj.productDeliveryLeadTimes || [],
        images      : productObj.productImages || [],
    }
};

app.post('/mada/api/v1/getreview', (req, res) => {
    getReview(req.body.url).then((response) => {
        res.send({
            returnCode: 1,
            data      : response,
            returnMsg : '리뷰 테스트'
        });
    }).catch((error) => {
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

    if (reviewCount > 100) reviewCount = 33;
    const returnArr = [];
    for (let i = 1; i <= reviewCount; i++) {
        const url = `https://smartstore.naver.com/i/v1/reviews/paged-reviews`

        // sortType 저거로 바꿔야 최신순으로 나옴
        // 3000개로 서버 올려보고 속도 영 안나오면 1000개로 ㄱㄱ
        await axios.post(url, {
            page           : i,
            pageSize       : 30,
            merchantNo     : merchantNo,
            originProductNo: originProductNo,
            sortType       : 'REVIEW_CREATE_DATE_DESC'
        }).then((response) => {
            const contents = response.data.contents;
            for (let j = 0; j < contents.length; j++) {
                if (!contents[j].productOptionContent) continue;
                if (!returnArr.find((object) => {
                    // 찾으면 cnt 증가
                    if (object.productOptionContent === contents[j].productOptionContent) {
                        object.cnt++;
                        object.reviewScore += Number(contents[j].reviewScore);
                        return true;
                    }
                })) {
                    // 못찾았으면 cnt 1 로하고 해당 데이터 returnArr에 푸쉬
                    contents[j].cnt = 1;
                    returnArr.push({
                        productOptionContent: contents[j].productOptionContent,
                        cnt                 : Number(contents[j].cnt),
                        reviewScore         : Number(contents[j].reviewScore)
                    });
                }
            }
        });
    }
    returnArr.sort((a, b) => b.cnt - a.cnt);
    return returnArr;
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
    const merchantNo = await driver.executeScript(`return __PRELOADED_STATE__.product.A.channel.naverPaySellerNo`);
    const reviewCount = await driver.executeScript(`return __PRELOADED_STATE__.product.A.reviewAmount.totalReviewCount`);
    await driver.quit();

    return await getReviewArr(Math.ceil(reviewCount / 30), merchantNo, originProductNo);
}
const axios = require('axios');
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());
// 크롤링 
const {Builder, By, until} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

// 검색키워드
const CryptoJS = require('crypto-js');
const accessKey = "0100000000138bb119fcc9beff61b42d84302bec7765ec74f10c27be2c9a6337a4a2f8abbc";
const secretKey = "AQAAAAATi7EZ/Mm+/2G0LYQwK+x3+bCPHlYe3Bme9Ma/tuVjwQ==";
const customerId = '1128231';

app.listen(3000, () => {
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

app.get('/mada/keywordstool', function (req, res) {
    getKeywords(req.query.searchkeyword).then((response) => {
        res.send(response);
    });
});

const getKeywords = async (searchKeyword) => {

    let resultArr = [];

    const method = "GET";
    const api_url = "/keywordstool";
    const timestamp = Date.now() + '';

    const hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, secretKey);
    hmac.update(`${timestamp}.${method}.${api_url}`);
    const hash = hmac.finalize();
    const signature = hash.toString(CryptoJS.enc.Base64);

    const options = {
        headers: {
            'X-Timestamp' : timestamp,
            'X-API-KEY'   : accessKey,
            'X-API-SECRET': secretKey,
            'X-CUSTOMER'  : customerId,
            'X-Signature' : signature
        }
    };

    const url = `https://api.naver.com/keywordstool?hintKeywords=${encodeURI(searchKeyword)}&showDetail=1`
    await axios.get(url, options).then(response => {
        const keywordList = (response.data.keywordList).slice(0, 20);
        for (let i = 0; i < keywordList.length; i++) {
            keywordList[i]['clkCntSum'] = keywordList[i]['monthlyMobileQcCnt'] + keywordList[i]['monthlyPcQcCnt'];
        }
        resultArr = keywordList;
    });
    return resultArr;
}


app.post('/mada/getReview', (req, res) => {
    getReview(req.body.url).then((response) => {
        res.send(response);
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

    if (reviewCount > 100) reviewCount = 100;
    const returnArr = [];
    for (let i = 1; i <= reviewCount; i++) {
        const url = `https://smartstore.naver.com/i/v1/reviews/paged-reviews`
        await axios.post(url, {
            page           : i,
            pageSize       : 30,
            merchantNo     : merchantNo,
            originProductNo: originProductNo,
            sortType       : 'REVIEW_RANKING'
        }).then((response) => {
            const contents = response.data.contents;
            for (let j = 0; j < contents.length; j++) {
                if (!contents[j].productOptionContent) continue;
                if (!returnArr.find((object) => {
                    // 찾으면 cnt 증가
                    if (object.productOptionContent === contents[j].productOptionContent) {
                        object.cnt++;
                        return true;
                    }
                })) {
                    // 못찾았으면 cnt 1 로하고 해당 데이터 returnArr에 푸쉬 
                    contents[j].cnt = 1;
                    returnArr.push({productOptionContent: contents[j].productOptionContent, cnt : contents[j].cnt});
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

/**
 * 등록일자 가져옴.
 */
app.post('/mada/getProductDate', (req, res) => {
    getProductDate(req.body.url).then((response) => {
        res.send(response);
    });
});

const getProductDate = async (url) => {
    const driver = await chromeOpen(url);

    // 상품에 대한 정보 담겨있음
    const productObj = await driver.executeScript(`return __PRELOADED_STATE__.product.A`);
    const resultObj = await getProductObj(productObj);

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
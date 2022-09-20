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

app.get('/keywordstool', function (req, res) {
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


app.post('/getReview', (req, res) => {
    crawling(req.body.url).then((response) => {
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
const getReview = async (reviewCount, merchantNo, originProductNo) => {

    let totalPage = Math.ceil(reviewCount.replace(/,/g, "") / 30);
    if (totalPage > 100) totalPage = 100;
    const returnArr = [];
    for (let i = 1; i <= totalPage; i++) {
        const url = `https://smartstore.naver.com/i/v1/reviews/paged-reviews?page=${i}&pageSize=30&merchantNo=${merchantNo}&originProductNo=${originProductNo}&sortType=REVIEW_RANKING`
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
                returnArr.push({productOptionContent: contents[j].productOptionContent});
            }
        });
    }
    return returnArr;
}

/**
 * naver 쇼핑 사이트 접속하여 리뷰 크롤링
 * @param url
 * @returns {Promise<*[]>}
 */
const crawling = async (url) => {

    const resultArr = [];

    const driver = await chromeOpen(url);
    // 로딩 제일 오래걸리는게 QNA 로 확인 되서 넣음
    await driver.wait(until.elementLocated(By.css('#QNA')));

    // __PRELOADED_STATE__ 를 window 객체에 넣고 그 안에 상품에 대한 정보를 담고 있음.
    const originProductNo = await driver.executeScript(`return __PRELOADED_STATE__.product.A.productNo`);
    const merchantNo = await driver.executeScript(`return __PRELOADED_STATE__.product.A.channel.naverPaySellerNo`);

    const reviewCount = await driver.findElement(By.xpath('//*[@id="content"]/div/div[2]/div[1]/div[2]/div[1]/a/strong')).getText();
    await driver.quit();
    const reviewArr = await getReview(reviewCount, merchantNo, originProductNo);
    reviewArr.map(item => {
        if (resultArr.find(object => {
            if (object.productOptionContent === item.productOptionContent) {
                object.cnt++;
                return true;
            } else {
                return false;
            }
        })) {
        } else {
            item.cnt = 1;
            resultArr.push(item);
        }
    })
    resultArr.sort((a, b) => b.cnt - a.cnt);
    return resultArr;
}

app.post('/getProductDate', (req, res) => {
    getProductDate(req.body.url).then((response) => {
        res.send(response);
    });
});

const getProductImageAndId = async (bestProductObj) => {
    const resultObj = {};
    /*    resultObj.DAILY = bestProductObj.DAILY.map((item) => {
            return {thumbnail: item.representativeImageUrl, id: item.id}
        });

        resultObj.WEEKLY = bestProductObj.WEEKLY.map((item) => {
            return {thumbnail: item.representativeImageUrl, id: item.id}
        });*/

    resultObj.MONTHLY = bestProductObj.MONTHLY.map((item) => {
        return {
            thumbnail   : item.representativeImageUrl,
            productId   : item.id,
            reviewAmount: item.reviewAmount,
            saleAmount  : item.saleAmount
        }
    });

    return resultObj;
}

const getProductRegDate = async (driver, resultObj, url) => {
    const urlArray = url.split('/');
    const storeInfo = urlArray[urlArray.length - 2];

    const resultFor = async (array) => {
        for (let i = 0; i < array.length; i++) {
            const page = `window.open("https://smartstore.naver.com/${storeInfo}/products/${array[i].productId}");`
            await driver.executeScript(page);
            const parent = await driver.getWindowHandle();
            const windows = await driver.getAllWindowHandles();
            await driver.switchTo().window(windows[1]);
            await driver.wait(until.elementLocated(By.css('#INTRODUCE')));
            array[i].regDate = new Date(await driver.executeScript(`return __PRELOADED_STATE__.product.A.regDate`)).toLocaleDateString();
            array[i].delivery = await driver.findElement(By.xpath('//*[@id="INTRODUCE"]/div/div[2]/div[2]/div[2]/ul')).getText();
            await driver.close();
            await driver.switchTo().window(parent);
        }
    }

    // await resultFor(resultObj.DAILY);
    // await resultFor(resultObj.WEEKLY);
    await resultFor(resultObj.MONTHLY);
}

const getProductDelivery = () => {

}

const getProductDate = async (url) => {
    const driver = await chromeOpen(url);

    await driver.wait(until.elementLocated(By.css('#content')));

    // __PRELOADED_STATE__ 를 window 객체에 넣고 그 안에 상품에 대한 정보를 담고 있음.
    const bestProductObj = await driver.executeScript(`return __PRELOADED_STATE__.bestProducts.A.bestProducts`);

    const resultObj = await getProductImageAndId(bestProductObj);

    await getProductRegDate(driver, resultObj, url);

    await driver.quit();
    return resultObj;
}
import {chromeOpen, headerOptions} from "../../utils/common.js";
import axios from "axios";

export default {
    getReviewAPI  : async ({mallProductUrl, reviewCount, originalMallProductId}) => {
        const defaultResponseData = {
            returnCode: 1,
            data      : [],
            returnMsg : ''
        };
        const {browser, page} = await chromeOpen(mallProductUrl);
        const merchantNo = await page.evaluate(() => {
            return __PRELOADED_STATE__.product.A.channel.naverPaySellerNo;
        });
        await browser.close();
        const resultMap = new Map();
        let productOptionContentDisplay = true;
        try {
            reviewCount = Math.ceil(reviewCount / 30);
            if (reviewCount > 33) reviewCount = 33;
            for (let i = 1; i <= reviewCount; i++) {
                const randomTime = Math.floor(Math.random() * (100 - 10 + 1)) + 50;
                const url = `https://brand.naver.com/n/v1/contents/reviews/query-pages`;
                const response = await axios.post(url, {
                    page              : i,
                    pageSize          : 30,
                    checkoutMerchantNo: merchantNo,
                    originProductNo   : originalMallProductId,
                    sortType          : 'REVIEW_CREATE_DATE_DESC'
                }, {
                    headers: headerOptions,
                });
                const contents = response.data.contents;
                for (let j = 0; j < contents.length; j++) {
                    if (!contents[j].productOptionContent) {
                        productOptionContentDisplay = false;
                        continue;
                    }

                    const key = contents[j].productOptionContent;
                    if (resultMap.has(key)) {
                        const item = resultMap.get(key);
                        item.count++;
                        item.reviewScore += +contents[j].reviewScore;
                        item.repurchase += +contents[j].repurchase;
                    } else {
                        resultMap.set(key, {
                            productOptionContent: key,
                            count               : 1,
                            reviewScore         : +contents[j].reviewScore,
                            repurchase          : +contents[j].repurchase
                        });
                    }
                }
                await new Promise(resolve => setTimeout(resolve, randomTime));
            }
            return {
                ...defaultResponseData,
                returnCode: productOptionContentDisplay ? 1 : -1,
                data      : Array.from(resultMap.values()).sort((a, b) => b.count - a.count),
                returnMsg : productOptionContentDisplay ? '리뷰가 정상적으로 조회되었습니다.' : '리뷰 옵션이 보이지 않는 상품이 존재합니다.'
            };
        } catch (e) {
            console.log(e.message);
            return {
                ...defaultResponseData,
                returnMsg : 'Naver 리뷰 서비스가 정상적이지 않습니다.\n약 30초 정도 후에 이용 부탁드리겠습니다.',
                returnCode: -1
            };
        }
    },
    getReviewCrawl: async ({mallProductUrl}) => {
        const defaultResponseData = {
            returnCode: 1,
            data      : [],
            returnMsg : ''
        };
        const {browser, page} = await chromeOpen(mallProductUrl);
        const inputArray = [];
        const resultMap = new Map();

        try {
            await page.waitForNavigation();

            await page.click('a[href="#REVIEW"]');
            while (true) {
                const randomTime = Math.floor(Math.random() * (300 - 200 + 1)) + 200;
                await new Promise((page) => setTimeout(page, randomTime));
                await page.waitForSelector('._2Ar8-aEUTq');
                const ariaHiddenValue = await page.$eval('._2Ar8-aEUTq', (nextButtonElement) => {
                    return nextButtonElement ? nextButtonElement.getAttribute('aria-hidden') : null;
                });
                if (ariaHiddenValue === 'true') break;
                inputArray.push(...await page.$$eval('._3i1mVq_JBd', (reviewElements) => {
                    const result = [];
                    for (let i = 0; i < reviewElements.length; i++) {
                        const emElement = reviewElements[i].querySelector('em');
                        const reviewScore = emElement ? emElement.textContent : 0;
                        const optionElement = reviewElements[i].querySelector('._2FXNMst_ak');
                        const productOptionContent = optionElement ? optionElement.innerText.split('\n')[0] : '옵션없음';
                        result.push({reviewScore, productOptionContent});
                    }
                    return result;
                }));
                await page.waitForSelector('._2Ar8-aEUTq');
                await page.click('._2Ar8-aEUTq');
            }

            for (let i = 0; i < inputArray.length; i++) {
                const item = inputArray[i];
                const key = item.productOptionContent;

                if (key !== '') {
                    if (resultMap.has(key)) {
                        const existingItem = resultMap.get(key);
                        existingItem.count++;
                        existingItem.reviewScore += +item.reviewScore;
                    } else {
                        const newItem = {
                            productOptionContent: key,
                            count               : 1,
                            reviewScore         : +item.reviewScore,
                        };
                        resultMap.set(item.productOptionContent, newItem);
                    }
                }
            }
            return {
                returnCode: 1,
                data      : Array.from(resultMap.values()).sort((a, b) => b.count - a.count),
                returnMsg : '리뷰가 정상적으로 조회되었습니다.',
            };
        } catch (e) {
            console.log(e.message);
            return {
                ...defaultResponseData,
                returnMsg : 'Naver 리뷰 서비스가 정상적이지 않습니다.\n약 30초 정도 후에 이용 부탁드리겠습니다.',
                returnCode: -1
            };
        } finally {
            await browser.close();
        }
    },
}
import {chromeOpen} from "../../utils/common.js";

export default {
    getShoppingList: async ({searchValue}) => {
        const defaultResponseData = {
            returnCode: 1,
            data      : [],
            returnMsg : ''
        };
        const encodeValue = encodeURI(searchValue);
        const searchUrl = `https://search.shopping.naver.com/search/all?adQuery=${encodeValue}&exagency=true&exrental=true&exused=true&frm=NVSCTAB&npayType=2&origQuery=${encodeValue}&pagingIndex=1&pagingSize=20&productSet=checkout&query=${encodeValue}&sort=review_rel&timestamp=&viewType=list`;
        const {browser, page} = await chromeOpen(searchUrl);
        try {
            const isNoResult = await page.evaluate(() => {
                const noResultElement = document.querySelector('.noResultWithBestResults_no_keyword___Jhtn');
                if (noResultElement) return noResultElement.textContent;
            });
            if (isNoResult) return {...defaultResponseData, returnCode: -1, returnMsg: isNoResult};

            const nextDataContent = await page.$eval('#__NEXT_DATA__', (dataElement) => {
                return dataElement.textContent;
            })

            if (nextDataContent) {
                const dataArray = JSON.parse(nextDataContent)?.props?.pageProps?.initialState?.products.list;
                for (let i = 0; i < dataArray.length; i++) {
                    if (!dataArray[i].item.mallProductUrl.includes('smartstore.naver.com')) continue;
                    defaultResponseData.data.push(dataArray[i].item);
                }
            }
            return {...defaultResponseData, returnMsg: '정상적으로 조회 되었습니다.'};
        } catch (e) {
            console.log(e);
            return {...defaultResponseData, returnMsg: e.message, returnCode: -1};
        } finally {
            await browser.close();
        }
    }
}
import fs from "fs";
import {getNumberKoreanDate, licensePath} from "../../utils/common.js";
import {manualWindow} from "../../../main.js";
import CryptoJS from "crypto-js";

export default {
    licenseCheck: async () => {
        const licenseKey = fs.readFileSync(licensePath, 'utf-8');
        const encryptionKey = '1234abcd5678efgh';
        try {
            const koreaDateNumber = await getNumberKoreanDate();
            const licenseKey = fs.readFileSync(licensePath, 'utf-8');
            const bytes = CryptoJS.AES.decrypt(licenseKey, encryptionKey);
            const licenseDateNumber = Number(bytes.toString(CryptoJS.enc.Utf8));

            return {returnCode: licenseDateNumber >= koreaDateNumber ? 1 : -1};
        } catch (e) {
            return {returnCode: false, errorMessage : e.message, encryptionKey, licenseKey};
        }
    },
    manualOpen  : () => {
        try {
            manualWindow.show();
            return true;
        } catch (e) {
            return e;
        }
    }
}
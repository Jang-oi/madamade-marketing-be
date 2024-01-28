import keywordService from "../../service/keyword/keywordService.js";

export default {
    getKeyword : async (req, res) => {
        res.send(await keywordService.getKeyword(req.body));
    }
}
import reviewService from "../../service/review/reviewService.js";

export default {
    getReview : async (req, res) => {
        res.send(await reviewService.getReviewAPI(req.body));
    },
}
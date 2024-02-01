import express from 'express';
import shopping from "../controller/shopping/shoppingListController.js";
import keyword from "../controller/keyword/keywordController.js";
import review from "../controller/review/reviewController.js";

const router = express.Router();

router.post(`/getShoppingList`, shopping.getShoppingList);
router.post(`/getKeyword`, keyword.getKeyword);
router.post(`/getReview`, review.getReview);

export default router;

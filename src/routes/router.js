import express from 'express';
import shopping from "../controller/shopping/shoppingListController.js";
import keyword from "../controller/keyword/keywordController.js";
import review from "../controller/review/reviewController.js";

const router = express.Router();
const BASE_URL = '/mada/api/v1';

router.post(`${BASE_URL}/getShoppingList`, shopping.getShoppingList);
router.post(`${BASE_URL}/getKeyword`, keyword.getKeyword);
router.post(`${BASE_URL}/getReview`, review.getReview);

export default router;

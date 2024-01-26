import express from 'express';
import shoppingListController from "../controller/shoppingListController";

const router = express.Router();
const BASE_URL = '/mada/api/v1';

router.post(`${BASE_URL}/getShoppingList`, shoppingListController.getShoppingList);


export {router};

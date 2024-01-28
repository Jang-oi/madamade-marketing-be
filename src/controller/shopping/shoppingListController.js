import shoppingListService from "../../service/shopping/shoppingListService.js";

export default {
    getShoppingList : async (req, res) => {
        res.send(await shoppingListService.getShoppingList(req.body));
    }
}
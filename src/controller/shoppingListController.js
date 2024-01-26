import shoppingListService from "../service/shoppingListService";

export default {
    getShoppingList : (req, res) => {
        res.send(shoppingListService.getShoppingList(req.body))
    }

}
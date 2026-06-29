const express = require('express');
const router = express.Router();
const { authenticate, validate, addCartItemSchema, updateCartItemSchema } = require('@inventory/shared');
const {
  getCart, addItem, updateItemQuantity, removeItem, clearCart
} = require('../controllers/cart.controller');

router.use(authenticate());

router.get('/', getCart);
router.post('/items', validate(addCartItemSchema), addItem);
router.put('/items/:itemId', validate(updateCartItemSchema), updateItemQuantity);
router.delete('/items/:itemId', removeItem);
router.delete('/', clearCart);

module.exports = { cartRouter: router };

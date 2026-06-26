const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../../shared/middleware/auth');
const {
  getCart, addItem, updateItemQuantity, removeItem, clearCart
} = require('../controllers/cart.controller');

router.use(authenticate());

router.get('/', getCart);
router.post('/items', addItem);
router.put('/items/:itemId', updateItemQuantity);
router.delete('/items/:itemId', removeItem);
router.delete('/', clearCart);

module.exports = { cartRouter: router };

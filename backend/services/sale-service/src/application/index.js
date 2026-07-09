// ============================================================
// Sales Application Service — Façade
// ============================================================

import {
  CreateSaleUseCase, GetSaleUseCase, ListSalesUseCase,
  GetClientSalesUseCase, CancelSaleUseCase,
  GetCartUseCase, AddCartItemUseCase, UpdateCartItemUseCase,
  RemoveCartItemUseCase, ClearCartUseCase, CheckoutUseCase,
} from '../usecases/index.js';

export class SalesApplicationService {
  constructor({ saleRepository, cartRepository, eventBus, supabase }) {
    this._createSale = new CreateSaleUseCase({ saleRepository, eventBus, supabase });
    this._getSale = new GetSaleUseCase({ saleRepository });
    this._listSales = new ListSalesUseCase({ saleRepository });
    this._getClientSales = new GetClientSalesUseCase({ saleRepository });
    this._cancelSale = new CancelSaleUseCase({ saleRepository, eventBus, supabase });
    this._getCart = new GetCartUseCase({ cartRepository });
    this._addCartItem = new AddCartItemUseCase({ cartRepository });
    this._updateCartItem = new UpdateCartItemUseCase({ cartRepository });
    this._removeCartItem = new RemoveCartItemUseCase({ cartRepository });
    this._clearCart = new ClearCartUseCase({ cartRepository });
    this._checkout = new CheckoutUseCase({ cartRepository, saleRepository, eventBus, supabase });
  }

  // Sales
  createSale(input) { return this._createSale.execute(input); }
  getSale(id) { return this._getSale.execute(id); }
  listSales(query) { return this._listSales.execute(query); }
  getClientSales(clientId, query) { return this._getClientSales.execute(clientId, query); }
  cancelSale(input) { return this._cancelSale.execute(input); }

  // Cart
  getCart(userId) { return this._getCart.execute(userId); }
  addCartItem(input) { return this._addCartItem.execute(input); }
  updateCartItem(itemId, quantity) { return this._updateCartItem.execute({ itemId, quantity }); }
  removeCartItem(itemId) { return this._removeCartItem.execute(itemId); }
  clearCart(userId) { return this._clearCart.execute(userId); }

  // Checkout
  checkout(input) { return this._checkout.execute(input); }
}

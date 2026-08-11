// ============================================================
// CRM Domain — Client, CreditAccount, NotificationPreference
// ============================================================

import { AggregateRoot } from '@erp/shared-kernel';

export class Client extends AggregateRoot {
  constructor({ id, userId, name, email, phone, documentType, documentNumber, address, city, state, postalCode, notes, isActive, sales, createdAt, updatedAt }) {
    super(id);
    this._userId = userId || null;
    this._name = name;
    this._email = email || '';
    this._phone = phone || '';
    this._documentType = documentType || '';
    this._documentNumber = documentNumber || '';
    this._address = address || '';
    this._city = city || '';
    this._state = state || '';
    this._postalCode = postalCode || '';
    this._notes = notes || '';
    this._isActive = isActive !== false;
    this._sales = sales || [];
    this._createdAt = createdAt || new Date();
    this._updatedAt = updatedAt || new Date();
  }

  get userId() { return this._userId; }
  get name() { return this._name; }
  get email() { return this._email; }
  get phone() { return this._phone; }
  get documentType() { return this._documentType; }
  get documentNumber() { return this._documentNumber; }
  get address() { return this._address; }
  get city() { return this._city; }
  get state() { return this._state; }
  get postalCode() { return this._postalCode; }
  get notes() { return this._notes; }
  get isActive() { return this._isActive; }
  get sales() { return this._sales; }
  get createdAt() { return this._createdAt; }
  get updatedAt() { return this._updatedAt; }

  updateInfo(info) {
    if (info.name) this._name = info.name;
    if (info.email !== undefined) this._email = info.email;
    if (info.phone !== undefined) this._phone = info.phone;
    if (info.documentType !== undefined) this._documentType = info.documentType;
    if (info.documentNumber !== undefined) this._documentNumber = info.documentNumber;
    if (info.address !== undefined) this._address = info.address;
    if (info.city !== undefined) this._city = info.city;
    if (info.state !== undefined) this._state = info.state;
    if (info.postalCode !== undefined) this._postalCode = info.postalCode;
    if (info.notes !== undefined) this._notes = info.notes;
    this._updatedAt = new Date();
  }

  deactivate() {
    this._isActive = false;
    this._updatedAt = new Date();
  }

  activate() {
    this._isActive = true;
    this._updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.id, userId: this._userId,
      name: this._name, email: this._email,
      phone: this._phone, documentType: this._documentType,
      documentNumber: this._documentNumber, address: this._address,
      city: this._city, state: this._state,
      postalCode: this._postalCode, notes: this._notes,
      isActive: this._isActive,
      sales: this._sales,
      createdAt: this._createdAt, updatedAt: this._updatedAt,
    };
  }
}

export class CreditAccount extends AggregateRoot {
  constructor({ id, clientId, accountNumber, accountType, creditLimit, currentBalance, isActive, createdAt, updatedAt }) {
    super(id);
    this._clientId = clientId;
    this._accountNumber = accountNumber;
    this._accountType = accountType || 'credito';
    this._creditLimit = creditLimit || 0;
    this._currentBalance = currentBalance || 0;
    this._isActive = isActive !== false;
    this._createdAt = createdAt || new Date();
    this._updatedAt = updatedAt || new Date();
  }

  get clientId() { return this._clientId; }
  get accountNumber() { return this._accountNumber; }
  get accountType() { return this._accountType; }
  get creditLimit() { return this._creditLimit; }
  get currentBalance() { return this._currentBalance; }
  get isActive() { return this._isActive; }
  get createdAt() { return this._createdAt; }
  get updatedAt() { return this._updatedAt; }

  update(info) {
    if (info.accountNumber) this._accountNumber = info.accountNumber;
    if (info.accountType) this._accountType = info.accountType;
    if (info.creditLimit !== undefined) this._creditLimit = info.creditLimit;
    this._updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.id, clientId: this._clientId,
      accountNumber: this._accountNumber,
      accountType: this._accountType,
      creditLimit: this._creditLimit,
      currentBalance: this._currentBalance,
      isActive: this._isActive,
      createdAt: this._createdAt, updatedAt: this._updatedAt,
    };
  }
}

export class NotificationPreference extends AggregateRoot {
  constructor({
    id, clientId, emailNotifications, smsNotifications, whatsappNotifications, pushNotifications,
    purchaseConfirmationEmail, purchaseConfirmationWhatsapp,
    shippingUpdatesEmail, shippingUpdatesWhatsapp, promoEmails, updatedAt,
  }) {
    super(id);
    this._clientId = clientId;
    this._emailNotifications = emailNotifications !== false;
    this._smsNotifications = smsNotifications !== false;
    this._whatsappNotifications = whatsappNotifications !== false;
    this._pushNotifications = pushNotifications !== false;
    this._purchaseConfirmationEmail = purchaseConfirmationEmail !== false;
    this._purchaseConfirmationWhatsapp = purchaseConfirmationWhatsapp === true;
    this._shippingUpdatesEmail = shippingUpdatesEmail !== false;
    this._shippingUpdatesWhatsapp = shippingUpdatesWhatsapp === true;
    this._promoEmails = promoEmails === true;
    this._updatedAt = updatedAt || new Date();
  }

  get clientId() { return this._clientId; }
  get emailNotifications() { return this._emailNotifications; }
  get smsNotifications() { return this._smsNotifications; }
  get whatsappNotifications() { return this._whatsappNotifications; }
  get pushNotifications() { return this._pushNotifications; }
  get purchaseConfirmationEmail() { return this._purchaseConfirmationEmail; }
  get purchaseConfirmationWhatsapp() { return this._purchaseConfirmationWhatsapp; }
  get shippingUpdatesEmail() { return this._shippingUpdatesEmail; }
  get shippingUpdatesWhatsapp() { return this._shippingUpdatesWhatsapp; }
  get promoEmails() { return this._promoEmails; }
  get updatedAt() { return this._updatedAt; }

  update(prefs) {
    if (prefs.emailNotifications !== undefined) this._emailNotifications = prefs.emailNotifications;
    if (prefs.smsNotifications !== undefined) this._smsNotifications = prefs.smsNotifications;
    if (prefs.whatsappNotifications !== undefined) this._whatsappNotifications = prefs.whatsappNotifications;
    if (prefs.pushNotifications !== undefined) this._pushNotifications = prefs.pushNotifications;
    if (prefs.purchaseConfirmationEmail !== undefined) this._purchaseConfirmationEmail = prefs.purchaseConfirmationEmail;
    if (prefs.purchaseConfirmationWhatsapp !== undefined) this._purchaseConfirmationWhatsapp = prefs.purchaseConfirmationWhatsapp;
    if (prefs.shippingUpdatesEmail !== undefined) this._shippingUpdatesEmail = prefs.shippingUpdatesEmail;
    if (prefs.shippingUpdatesWhatsapp !== undefined) this._shippingUpdatesWhatsapp = prefs.shippingUpdatesWhatsapp;
    if (prefs.promoEmails !== undefined) this._promoEmails = prefs.promoEmails;
    this._updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.id, clientId: this._clientId,
      emailNotifications: this._emailNotifications,
      smsNotifications: this._smsNotifications,
      whatsappNotifications: this._whatsappNotifications,
      pushNotifications: this._pushNotifications,
      purchaseConfirmationEmail: this._purchaseConfirmationEmail,
      purchaseConfirmationWhatsapp: this._purchaseConfirmationWhatsapp,
      shippingUpdatesEmail: this._shippingUpdatesEmail,
      shippingUpdatesWhatsapp: this._shippingUpdatesWhatsapp,
      promoEmails: this._promoEmails,
      updatedAt: this._updatedAt,
    };
  }
}

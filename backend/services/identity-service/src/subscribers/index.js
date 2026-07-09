// ============================================================
// Identity Event Subscribers
// ============================================================

import { IEventHandler } from '@erp/shared-kernel';

/**
 * When a user registers, create client record (if role is cliente)
 */
export class CreateClientOnUserRegistered extends IEventHandler {
  #supabase;

  constructor(supabaseClient) {
    super();
    this.#supabase = supabaseClient;
  }

  async handle(event) {
    if (event.payload.role !== 'cliente') return;

    const { userId, email, name } = event.payload;

    const { error } = await this.#supabase
      .from('clients')
      .upsert({
        id: userId,
        user_id: userId,
        email,
        name,
        is_active: true,
      }, { onConflict: 'user_id' });

    if (error) {
      console.error(`[IdentitySubscriber] Failed to create client for user ${userId}:`, error.message);
    }
  }
}

/**
 * When a user logs in, record audit log entry
 */
export class AuditLoginOnUserLoggedIn extends IEventHandler {
  #supabase;

  constructor(supabaseClient) {
    super();
    this.#supabase = supabaseClient;
  }

  async handle(event) {
    const { userId, ipAddress } = event.payload;

    const { error } = await this.#supabase
      .from('audit_logs')
      .insert({
        entity: 'auth',
        entity_id: userId,
        action: 'login',
        ip_address: ipAddress,
        created_by: userId,
        severity: 'info',
      });

    if (error) {
      console.error(`[IdentitySubscriber] Failed to audit login for user ${userId}:`, error.message);
    }
  }
}

export default { CreateClientOnUserRegistered, AuditLoginOnUserLoggedIn };


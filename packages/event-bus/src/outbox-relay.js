// ============================================================
// OutboxRelay — Publica eventos de `transactional_outbox` al EventBus
// ============================================================
// Lee eventos pendientes (sp_get_pending_outbox), los publica al
// EventBus (InMemory o RabbitMQ) y los marca como publicados.
// Los eventos se escriben en la MISMA transacción que la entidad
// (ver sp_create_sale en migración 049) → publicación garantizada
// (Outbox Pattern), incluso si el servicio muere tras el commit.

function toDomainEvent(row) {
  const occurredOn = row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString();
  return {
    eventId: row.id,
    aggregateId: row.aggregate_id,
    eventType: row.event_type,
    occurredOn,
    payload: row.payload || {},
    correlationId: row.correlation_id || null,
    toJSON() {
      return {
        eventId: this.eventId,
        aggregateId: this.aggregateId,
        eventType: this.eventType,
        occurredOn: this.occurredOn,
        payload: this.payload,
      };
    },
  };
}

export class OutboxRelay {
  constructor({
    supabase,
    eventBus,
    pollIntervalMs = 5000,
    batchSize = 100,
    logger = console,
  }) {
    this._supabase = supabase;
    this._eventBus = eventBus;
    this._pollIntervalMs = pollIntervalMs;
    this._batchSize = batchSize;
    this._logger = logger;
    this._timer = null;
    this._running = false;
    this._stopped = false;
  }

  start() {
    if (this._timer) return;
    this._stopped = false;
    this._logger.info(`[OutboxRelay] iniciado (poll cada ${this._pollIntervalMs}ms)`);
    // primer tick inmediato para no esperar el intervalo
    this.tick();
    this._timer = setInterval(() => this.tick(), this._pollIntervalMs);
    if (this._timer.unref) this._timer.unref();
  }

  async stop() {
    this._stopped = true;
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this._logger.info('[OutboxRelay] detenido');
  }

  async tick() {
    if (this._running || this._stopped) return;
    this._running = true;
    try {
      const { data: rows, error } = await this._supabase.rpc('sp_get_pending_outbox', {
        p_limit: this._batchSize,
      });

      if (error) {
        // Migración 049 no aplicada → el patrón outbox no está disponible
        if (/does not exist/i.test(error.message || '')) {
          this._logger.warn('[OutboxRelay] sp_get_pending_outbox no existe (migración 049 pendiente). Relay desactivado.');
          await this.stop();
          return;
        }
        throw error;
      }

      if (!rows || rows.length === 0) return;

      const publishedIds = [];
      const failedIds = [];
      let lastError = null;

      for (const row of rows) {
        try {
          await this._eventBus.publish(toDomainEvent(row));
          publishedIds.push(row.id);
        } catch (err) {
          lastError = err.message || 'publish_error';
          failedIds.push(row.id);
          this._logger.error(`[OutboxRelay] fallo publicando ${row.event_type} (${row.id}): ${lastError}`);
        }
      }

      if (publishedIds.length > 0) {
        const { error: markError } = await this._supabase.rpc('sp_mark_outbox_published', {
          p_ids: publishedIds,
        });
        if (markError) this._logger.error(`[OutboxRelay] no se pudieron marcar publicados: ${markError.message}`);
      }

      if (failedIds.length > 0) {
        const { error: failError } = await this._supabase.rpc('sp_mark_outbox_failed', {
          p_ids: failedIds,
          p_error: lastError,
        });
        if (failError) this._logger.error(`[OutboxRelay] no se pudieron marcar fallidos: ${failError.message}`);
      }
    } catch (err) {
      this._logger.error(`[OutboxRelay] error en ciclo: ${err.message}`);
    } finally {
      this._running = false;
    }
  }
}

export default OutboxRelay;

// ============================================================================
// Integration Controller — Webhooks & Automations
// ============================================================================

import { deliverWebhook } from '../webhooks/dispatcher.js';
import { runWebhookCycle } from '../webhooks/worker.js';

function ok(res, data, message, status = 200) { return res.status(status).json({ success: true, data, message }); }
function fail(res, error, status = 400) { return res.status(status).json({ success: false, error }); }

// ════════════════════════════════════════════════════════════════════════
// EVENT TYPES
// ════════════════════════════════════════════════════════════════════════

export async function listEventTypes(req, res) {
  try {
    const sb = req.sb;
    const { data, error } = await sb.from('webhook_event_types').select('*').eq('is_active', true).order('category').order('name');
    if (error) throw new Error(error.message);
    return ok(res, data || []);
  } catch (err) { return fail(res, err.message, 500); }
}

// ════════════════════════════════════════════════════════════════════════
// WEBHOOKS
// ════════════════════════════════════════════════════════════════════════

export async function listWebhooks(req, res) {
  try {
    const sb = req.sb;
    const companyId = req.user?.companyId;
    if (!companyId) return fail(res, 'Company context required', 403);
    const { data, error } = await sb.from('webhooks')
      .select('*').eq('company_id', companyId).order('name');
    if (error) throw new Error(error.message);
    return ok(res, data || []);
  } catch (err) { return fail(res, err.message, 500); }
}

export async function getWebhook(req, res) {
  try {
    const sb = req.sb;
    const { data, error } = await sb.from('webhooks').select('*').eq('id', req.params.id).single();
    if (error || !data) return fail(res, 'Webhook not found', 404);
    return ok(res, data);
  } catch (err) { return fail(res, err.message, 500); }
}

async function resolveEventTypes(sb, event_type_ids, events) {
  if (Array.isArray(events) && events.length) return events;
  if (!Array.isArray(event_type_ids) || !event_type_ids.length) return null;
  const { data, error } = await sb.from('webhook_event_types').select('event_type').in('id', event_type_ids);
  if (error) throw new Error(error.message);
  return (data || []).map((e) => e.event_type);
}

export async function createWebhook(req, res) {
  try {
    const sb = req.sb;
    const companyId = req.user?.companyId;
    if (!companyId) return fail(res, 'Company context required', 403);
    const {
      name, url, description, event_type_ids, events,
      http_method, content_type, auth_type, auth_value, auth_header,
      custom_headers, filter_conditions, retry_count, retry_delay_ms,
      timeout_ms, rate_limit, batch_size, batch_window_ms,
      payload_template, is_active,
    } = req.body;
    if (!name || !url) return fail(res, 'name and url are required');

    const eventTypes = await resolveEventTypes(sb, event_type_ids, events);
    if (!eventTypes?.length) return fail(res, 'events (o event_type_ids) son requeridos');

    const { data, error } = await sb.from('webhooks').insert({
      company_id: companyId,
      name,
      url,
      description: description || null,
      events: eventTypes,
      http_method: http_method || 'POST',
      content_type: content_type || 'application/json',
      auth_type: auth_type || 'none',
      auth_value: auth_value || null,
      auth_header: auth_header || 'Authorization',
      custom_headers: custom_headers || {},
      filter_conditions: filter_conditions || null,
      retry_count: retry_count ?? 3,
      retry_delay_ms: retry_delay_ms ?? 5000,
      timeout_ms: timeout_ms ?? 10000,
      rate_limit: rate_limit ?? 60,
      batch_size: batch_size ?? 1,
      batch_window_ms: batch_window_ms ?? 5000,
      payload_template: payload_template || null,
      is_active: is_active !== false,
      created_by: req.user?.id,
    }).select().single();
    if (error) throw new Error(error.message);

    return ok(res, data, 'Webhook created', 201);
  } catch (err) { return fail(res, err.message, 500); }
}

export async function updateWebhook(req, res) {
  try {
    const sb = req.sb;
    const allowed = [
      'name', 'url', 'description', 'http_method', 'content_type',
      'auth_type', 'auth_value', 'auth_header', 'custom_headers',
      'filter_conditions', 'retry_count', 'retry_delay_ms', 'timeout_ms',
      'rate_limit', 'batch_size', 'batch_window_ms', 'payload_template', 'is_active',
    ];
    const payload = {};
    for (const k of allowed) if (req.body[k] !== undefined) payload[k] = req.body[k];
    payload.updated_at = new Date().toISOString();

    // Si se envían event_type_ids o events, actualizar la suscripción
    if (req.body.event_type_ids || req.body.events) {
      const eventTypes = await resolveEventTypes(sb, req.body.event_type_ids, req.body.events);
      if (eventTypes?.length) payload.events = eventTypes;
    }

    const { data, error } = await sb.from('webhooks').update(payload).eq('id', req.params.id).select().single();
    if (error || !data) return fail(res, 'Webhook not found', 404);

    return ok(res, data, 'Webhook updated');
  } catch (err) { return fail(res, err.message, 500); }
}

export async function deleteWebhook(req, res) {
  try {
    const sb = req.sb;
    const { data, error } = await sb.from('webhooks').delete().eq('id', req.params.id).select().single();
    if (error || !data) return fail(res, 'Webhook not found', 404);
    return ok(res, null, 'Webhook deleted');
  } catch (err) { return fail(res, err.message, 500); }
}

export async function testWebhook(req, res) {
  try {
    const sb = req.sb;
    const { data: webhook, error } = await sb.from('webhooks').select('*').eq('id', req.params.id).single();
    if (error || !webhook) return fail(res, 'Webhook not found', 404);

    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      company_id: req.user?.companyId,
      data: { message: 'Test webhook delivery', webhook_id: webhook.id }
    };

    // Mismo pipeline que el worker: SSRF guard + firma HMAC + timeout
    const delivery = await deliverWebhook(webhook, testPayload, { eventType: 'webhook.test' });

    const delivery_status = delivery.ok ? 'success' : 'error';
    const logPayload = {
      webhook_id: webhook.id,
      company_id: webhook.company_id || req.user?.companyId,
      event_type: 'webhook.test',
      payload: testPayload,
      attempt: 1,
      max_attempts: webhook.retry_count || 3,
      status: delivery_status,
      response_status: delivery.status ?? null,
      response_body: delivery.body?.substring(0, 5000) || delivery.error?.substring(0, 5000) || null,
      error_message: delivery.error || null,
      request_signature: delivery.signature || null,
      resolved_ip: delivery.resolvedIp || null,
      duration_ms: Math.round(delivery.durationMs),
      completed_at: new Date().toISOString(),
    };

    await sb.from('webhook_logs').insert(logPayload);

    return ok(res, {
      status: delivery_status,
      response_code: delivery.status,
      duration_ms: Math.round(delivery.durationMs),
      error: delivery.error || null,
      response_body: delivery.body?.substring(0, 500) || null,
    }, delivery_status === 'success' ? 'Webhook delivered' : 'Webhook delivery failed', delivery_status === 'success' ? 200 : 400);
  } catch (err) { return fail(res, err.message, 500); }
}

/**
 * Ejecuta UN ciclo del worker de webhooks (útil para tests y operaciones).
 * POST /api/integrations/webhooks/process-queue
 */
export async function processQueue(req, res) {
  try {
    const result = await runWebhookCycle(req.sb, { batch: Number(req.body?.batch) || 20 });
    return ok(res, result);
  } catch (err) { return fail(res, err.message, 500); }
}

export async function webhookLogs(req, res) {
  try {
    const sb = req.sb;
    const { page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, page) - 1) * Math.min(100, limit);

    const { data, error, count } = await sb.from('webhook_logs')
      .select('*', { count: 'exact' }).eq('webhook_id', req.params.id)
      .order('created_at', { ascending: false }).range(offset, offset + Math.min(100, limit) - 1);
    if (error) throw new Error(error.message);
    return res.json({ success: true, data: data || [], pagination: { page: +page, limit: +limit, total: count || 0 } });
  } catch (err) { return fail(res, err.message, 500); }
}

// ════════════════════════════════════════════════════════════════════════
// AUTOMATIONS
// ════════════════════════════════════════════════════════════════════════

export async function listAutomations(req, res) {
  try {
    const sb = req.sb;
    const companyId = req.user?.companyId;
    if (!companyId) return fail(res, 'Company context required', 403);
    const { data, error } = await sb.from('automation_rules')
      .select('*').eq('company_id', companyId).order('name');
    if (error) throw new Error(error.message);
    return ok(res, data || []);
  } catch (err) { return fail(res, err.message, 500); }
}

export async function getAutomation(req, res) {
  try {
    const sb = req.sb;
    const { data, error } = await sb.from('automation_rules').select('*, actions:automation_actions(*)').eq('id', req.params.id).single();
    if (error || !data) return fail(res, 'Automation not found', 404);
    if (data.actions) data.actions.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    return ok(res, data);
  } catch (err) { return fail(res, err.message, 500); }
}

export async function createAutomation(req, res) {
  try {
    const sb = req.sb;
    const companyId = req.user?.companyId;
    if (!companyId) return fail(res, 'Company context required', 403);
    const { name, description, trigger_event, conditions, actions, is_active, priority } = req.body;
    if (!name || !trigger_event) return fail(res, 'name and trigger_event are required');

    const { data, error } = await sb.from('automation_rules').insert({
      company_id: companyId, name, description: description || null,
      trigger_event,
      trigger_conditions: conditions || {},
      is_active: is_active !== false,
      priority: priority || 0,
      run_count: 0, last_run_at: null, error_count: 0,
      created_by: req.user?.id
    }).select().single();
    if (error) throw new Error(error.message);

    // Create actions if provided
    if (actions?.length && data) {
      const actionPayloads = actions.map((a, i) => ({
        rule_id: data.id,
        company_id: companyId,
        action_type: a.action_type,
        config: a.action_config || a.config || {},
        sort_order: a.sort_order ?? i + 1,
        is_active: a.is_active !== false,
        conditions: a.conditions || {},
        timeout_ms: a.timeout_ms ?? 10000,
        retry_on_fail: a.retry_on_fail ?? false,
        max_retries: a.max_retries ?? 0
      }));
      await sb.from('automation_actions').insert(actionPayloads);
    }

    return ok(res, data, 'Automation created', 201);
  } catch (err) { return fail(res, err.message, 500); }
}

export async function updateAutomation(req, res) {
  try {
    const sb = req.sb;
    const companyId = req.user?.companyId;
    const allowed = ['name', 'description', 'trigger_event', 'trigger_conditions', 'is_active', 'priority', 'timeout_ms'];
    const payload = {};
    for (const k of allowed) if (req.body[k] !== undefined) payload[k] = req.body[k];
    if (req.body.conditions !== undefined) payload.trigger_conditions = req.body.conditions;
    payload.updated_at = new Date().toISOString();

    const { data, error } = await sb.from('automation_rules').update(payload).eq('id', req.params.id).select().single();
    if (error || !data) return fail(res, 'Automation not found', 404);

    // Update actions if provided
    if (req.body.actions) {
      await sb.from('automation_actions').delete().eq('rule_id', data.id);
      if (req.body.actions.length) {
        const actionPayloads = req.body.actions.map((a, i) => ({
          rule_id: data.id, company_id: companyId,
          action_type: a.action_type,
          config: a.action_config || a.config || {},
          sort_order: a.sort_order ?? i + 1,
          is_active: a.is_active !== false,
          conditions: a.conditions || {},
          timeout_ms: a.timeout_ms ?? 10000,
          retry_on_fail: a.retry_on_fail ?? false,
          max_retries: a.max_retries ?? 0
        }));
        await sb.from('automation_actions').insert(actionPayloads);
      }
    }

    return ok(res, data, 'Automation updated');
  } catch (err) { return fail(res, err.message, 500); }
}

export async function deleteAutomation(req, res) {
  try {
    const sb = req.sb;
    const { data, error } = await sb.from('automation_rules').delete().eq('id', req.params.id).select().single();
    if (error || !data) return fail(res, 'Automation not found', 404);
    return ok(res, null, 'Automation deleted');
  } catch (err) { return fail(res, err.message, 500); }
}

export async function toggleAutomation(req, res) {
  try {
    const sb = req.sb;
    const { data: current } = await sb.from('automation_rules').select('is_active').eq('id', req.params.id).single();
    if (!current) return fail(res, 'Automation not found', 404);

    const { data, error } = await sb.from('automation_rules')
      .update({ is_active: !current.is_active, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) throw new Error(error.message);
    return ok(res, data, `Automation ${data.is_active ? 'activated' : 'deactivated'}`);
  } catch (err) { return fail(res, err.message, 500); }
}

export async function testAutomation(req, res) {
  try {
    const sb = req.sb;
    const companyId = req.user?.companyId;
    const { data: automation } = await sb.from('automation_rules')
      .select('*, actions:automation_actions(*)').eq('id', req.params.id).single();
    if (!automation) return fail(res, 'Automation not found', 404);

    const testEvent = {
      event: automation.trigger_event,
      timestamp: new Date().toISOString(),
      company_id: companyId,
      data: req.body.test_data || {}
    };

    // Log the test execution
    const { data: log, error: logErr } = await sb.from('automation_logs').insert({
      rule_id: automation.id,
      company_id: companyId,
      trigger_event: automation.trigger_event,
      trigger_entity: 'manual_test',
      status: 'simulated',
      input_data: testEvent,
      output_data: (automation.actions || []).map(a => ({
        action_id: a.id, type: a.action_type, config: a.config, status: 'simulated'
      })),
      duration_ms: 0,
      error_message: null
    }).select().single();
    if (logErr) throw new Error(logErr.message);

    return ok(res, { log, message: 'Automation test executed (simulated)' });
  } catch (err) { return fail(res, err.message, 500); }
}

export async function automationLogs(req, res) {
  try {
    const sb = req.sb;
    const { page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, page) - 1) * Math.min(100, limit);

    const { data, error, count } = await sb.from('automation_logs')
      .select('*', { count: 'exact' }).eq('rule_id', req.params.id)
      .order('created_at', { ascending: false }).range(offset, offset + Math.min(100, limit) - 1);
    if (error) throw new Error(error.message);
    return res.json({ success: true, data: data || [], pagination: { page: +page, limit: +limit, total: count || 0 } });
  } catch (err) { return fail(res, err.message, 500); }
}

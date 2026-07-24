/**
 * Circuit Breaker para llamadas HTTP entre microservicios
 * Implementa el patrón Circuit Breaker para evitar fallos en cascada
 * Estados: CLOSED (funcionando) -> OPEN (fallando) -> HALF_OPEN (probando)
 */

const CIRCUIT_STATES = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
};

class CircuitBreaker {
  constructor(options = {}) {
    this.name = options.name || 'default';
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 30000; // 30s antes de pasar a HALF_OPEN
    this.resetTimeout = options.resetTimeout || 60000; // 60s antes de resetear contadores

    this.state = CIRCUIT_STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }

  async call(action) {
    if (this.state === CIRCUIT_STATES.OPEN) {
      if (Date.now() >= this.nextAttemptTime) {
        this.state = CIRCUIT_STATES.HALF_OPEN;
        console.log(`[CircuitBreaker:${this.name}] OPEN -> HALF_OPEN (probando)`);
      } else {
        throw new Error(`CircuitBreaker ${this.name}: Circuito ABIERTO. Intente nuevamente en ${Math.ceil((this.nextAttemptTime - Date.now()) / 1000)}s`);
      }
    }

    try {
      const result = await action();

      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;

    if (this.state === CIRCUIT_STATES.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.successThreshold) {
        this.successCount = 0;
        this.state = CIRCUIT_STATES.CLOSED;
        console.log(`[CircuitBreaker:${this.name}] HALF_OPEN -> CLOSED (recuperado)`);
      }
    }
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CIRCUIT_STATES.HALF_OPEN) {
      this.state = CIRCUIT_STATES.OPEN;
      this.nextAttemptTime = Date.now() + this.timeout;
      console.log(`[CircuitBreaker:${this.name}] HALF_OPEN -> OPEN (falló prueba)`);
    } else if (this.failureCount >= this.failureThreshold) {
      this.state = CIRCUIT_STATES.OPEN;
      this.nextAttemptTime = Date.now() + this.timeout;
      console.log(`[CircuitBreaker:${this.name}] CLOSED -> OPEN (${this.failureCount} fallos)`);
    }
  }

  getState() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      failureThreshold: this.failureThreshold,
      successThreshold: this.successThreshold,
      timeout: this.timeout
    };
  }

  reset() {
    this.state = CIRCUIT_STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }
}

// Registry de circuit breakers por servicio
const circuitRegistry = new Map();

function getCircuitBreaker(serviceName, options = {}) {
  if (!circuitRegistry.has(serviceName)) {
    circuitRegistry.set(serviceName, new CircuitBreaker({ name: serviceName, ...options }));
  }
  return circuitRegistry.get(serviceName);
}

function getAllCircuitStates() {
  const states = {};
  circuitRegistry.forEach((cb, name) => {
    states[name] = cb.getState();
  });
  return states;
}

module.exports = {
  CircuitBreaker,
  getCircuitBreaker,
  getAllCircuitStates,
  CIRCUIT_STATES
};

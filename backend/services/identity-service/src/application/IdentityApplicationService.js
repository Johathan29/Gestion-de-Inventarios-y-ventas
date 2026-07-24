// ============================================================
// Identity Application Service — Orchestrates use cases
// ============================================================

import {
  RegisterUserUseCase, LoginUseCase, RefreshTokenUseCase,
  ChangePasswordUseCase, UpdateUserUseCase, GetUserUseCase, ListUsersUseCase,
  ToggleActiveUserUseCase, ChangeUserRoleUseCase, GetUserAccessHistoryUseCase,
} from '../usecases/index.js';

export class IdentityApplicationService {
  #registerUser;
  #login;
  #refreshToken;
  #changePassword;
  #updateUser;
  #getUser;
  #listUsers;
  #toggleActive;
  #changeRole;
  #getAccessHistory;

  constructor(dependencies) {
    this.#registerUser = new RegisterUserUseCase(dependencies);
    this.#login = new LoginUseCase(dependencies);
    this.#refreshToken = new RefreshTokenUseCase(dependencies);
    this.#changePassword = new ChangePasswordUseCase(dependencies);
    this.#updateUser = new UpdateUserUseCase(dependencies);
    this.#getUser = new GetUserUseCase(dependencies);
    this.#listUsers = new ListUsersUseCase(dependencies);
    this.#toggleActive = new ToggleActiveUserUseCase(dependencies);
    this.#changeRole = new ChangeUserRoleUseCase(dependencies);
    this.#getAccessHistory = new GetUserAccessHistoryUseCase(dependencies);
  }

  async register(dto) { return this.#registerUser.execute(dto); }
  async login(dto, ipAddress) { return this.#login.execute({ ...dto, ipAddress }); }
  async refreshToken(dto) { return this.#refreshToken.execute(dto); }
  async changePassword(userId, dto) { return this.#changePassword.execute({ ...dto, userId }); }
  async updateUser(id, updates) { return this.#updateUser.execute({ id, updates }); }
  async getUser(id) { return this.#getUser.execute(id); }
  async listUsers(query) { return this.#listUsers.execute(query); }
  async toggleActive(id) { return this.#toggleActive.execute(id); }
  async changeRole(id, roleName) { return this.#changeRole.execute(id, roleName); }
  async getAccessHistory(id) { return this.#getAccessHistory.execute(id); }
}

export default IdentityApplicationService;

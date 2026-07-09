// ============================================================
// Identity Application Service — Orchestrates use cases
// ============================================================

import {
  RegisterUserUseCase, LoginUseCase, RefreshTokenUseCase,
  ChangePasswordUseCase, UpdateUserUseCase, GetUserUseCase, ListUsersUseCase,
} from '../usecases/index.js';

export class IdentityApplicationService {
  #registerUser;
  #login;
  #refreshToken;
  #changePassword;
  #updateUser;
  #getUser;
  #listUsers;

  constructor(dependencies) {
    this.#registerUser = new RegisterUserUseCase(dependencies);
    this.#login = new LoginUseCase(dependencies);
    this.#refreshToken = new RefreshTokenUseCase(dependencies);
    this.#changePassword = new ChangePasswordUseCase(dependencies);
    this.#updateUser = new UpdateUserUseCase(dependencies);
    this.#getUser = new GetUserUseCase(dependencies);
    this.#listUsers = new ListUsersUseCase(dependencies);
  }

  async register(dto) { return this.#registerUser.execute(dto); }
  async login(dto, ipAddress) { return this.#login.execute({ ...dto, ipAddress }); }
  async refreshToken(dto) { return this.#refreshToken.execute(dto); }
  async changePassword(userId, dto) { return this.#changePassword.execute({ ...dto, userId }); }
  async updateUser(id, updates) { return this.#updateUser.execute({ id, updates }); }
  async getUser(id) { return this.#getUser.execute(id); }
  async listUsers(query) { return this.#listUsers.execute(query); }
}

export default IdentityApplicationService;

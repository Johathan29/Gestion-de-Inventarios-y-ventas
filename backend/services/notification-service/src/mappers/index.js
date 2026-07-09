// ============================================================
// Notification Mappers
// ============================================================

import { UserNotification } from '../domain/index.js';

export class NotificationMapper {
  static toDomain(raw) {
    if (!raw) return null;
    return new UserNotification({
      id: raw.id,
      userId: raw.user_id,
      type: raw.type,
      title: raw.title,
      message: raw.message,
      data: raw.data,
      read: raw.read,
      readAt: raw.read_at,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    });
  }

  static toPersistence(domain) {
    return {
      user_id: domain.userId,
      type: domain.type,
      title: domain.title,
      message: domain.message,
      data: domain.data,
      read: domain.read,
      read_at: domain.readAt?.toISOString(),
    };
  }

  static toDTO(domain) {
    return domain.toJSON();
  }

  static toDTOList(domains) {
    return domains.map(d => NotificationMapper.toDTO(d));
  }
}

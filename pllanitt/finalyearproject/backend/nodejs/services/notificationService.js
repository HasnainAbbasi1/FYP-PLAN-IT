const Notification = require('../models/Notification');
const User = require('../models/User');
const emailService = require('./emailService');

/**
 * Create a notification
 */
async function createNotification(userId, type, title, message, link = null, metadata = null) {
  try {
    const notification = await Notification.create({
      user_id: userId,
      type,
      title,
      message,
      link,
      metadata
    });

    // Send email notification for critical events
    const criticalTypes = ['status_change', 'project_update', 'stage_change', 'deadline_approaching'];
    if (criticalTypes.includes(type)) {
      try {
        const user = await User.findByPk(userId);
        if (user && user.email) {
          // Send email asynchronously (don't wait for it)
          emailService.sendNotificationEmail(user.email, user.name, title, message, link)
            .then(result => {
              if (result.success) {
                console.log(`✅ Notification email sent to ${user.email}`);
              } else {
                console.log(`⚠️ Failed to send notification email to ${user.email}:`, result.error);
              }
            })
            .catch(error => {
              console.log(`⚠️ Notification email error for ${user.email}:`, error.message);
            });
        }
      } catch (emailError) {
        // Don't fail notification creation if email fails
        console.error('Error sending notification email:', emailError);
      }
    }

    // TODO: Send real-time notification via WebSocket if user is online

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Get user notifications
 */
async function getUserNotifications(userId, { limit = 50, offset = 0, unreadOnly = false } = {}) {
  try {
    const where = { user_id: userId };
    if (unreadOnly) {
      where.read = false;
    }

    const notifications = await Notification.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return {
      notifications: notifications.rows,
      total: notifications.count,
      unreadCount: await Notification.count({
        where: { user_id: userId, read: false }
      })
    };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
}

/**
 * Mark notification as read
 */
async function markAsRead(notificationId, userId) {
  try {
    const notification = await Notification.findOne({
      where: {
        id: notificationId,
        user_id: userId
      }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.read = true;
    await notification.save();

    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 */
async function markAllAsRead(userId) {
  try {
    await Notification.update(
      { read: true },
      { where: { user_id: userId, read: false } }
    );

    return { success: true };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

/**
 * Delete notification
 */
async function deleteNotification(notificationId, userId) {
  try {
    const notification = await Notification.findOne({
      where: {
        id: notificationId,
        user_id: userId
      }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await notification.destroy();
    return { success: true };
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
}

/**
 * Create project-related notifications
 */
async function notifyProjectUpdate(projectId, projectTitle, userId, action, metadata = {}) {
  // Notify project creator and team members
  // This is a simplified version - you'd want to get actual team members
  const notification = await createNotification(
    userId,
    'project_update',
    'Project Updated',
    `Project "${projectTitle}" has been ${action}`,
    `/projects/${projectId}`,
    { projectId, ...metadata }
  );

  return notification;
}

/**
 * Create status change notification
 */
async function notifyStatusChange(projectId, projectTitle, userId, oldStatus, newStatus) {
  return await createNotification(
    userId,
    'status_change',
    'Project Status Changed',
    `Project "${projectTitle}" status changed from ${oldStatus} to ${newStatus}`,
    `/projects/${projectId}`,
    { projectId, oldStatus, newStatus }
  );
}

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  notifyProjectUpdate,
  notifyStatusChange
};


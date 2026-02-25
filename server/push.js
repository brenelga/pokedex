import webpush from 'web-push';
import { CONFIG } from './config.js';

webpush.setVapidDetails(
    CONFIG.VAPID_EMAIL,
    CONFIG.VAPID_PUBLIC_KEY,
    CONFIG.VAPID_PRIVATE_KEY
);

export const sendNotification = async (subscription, payload) => {
    try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        console.log('Notification sent successfully');
        return true;
    } catch (error) {
        console.error('Error sending notification:', error);
        return false;
    }
};

export const sendPushToUser = (user, payload) => {
    if (!user.pushSubscription) return Promise.resolve(false);
    return sendNotification(user.pushSubscription, payload);
};

<?php
if (!defined('ABSPATH')) exit;

class MedEduTelegram {
    public static function send_message($message, $channel_id = null) {
        $token = get_option('med_edu_telegram_bot_token');
        $chat_id = $channel_id ?: get_option('med_edu_telegram_channel_id');

        if (!$token || !$chat_id) return false;

        $url = "https://api.telegram.org/bot$token/sendMessage";

        $response = wp_remote_post($url, [
            'body' => [
                'chat_id' => $chat_id,
                'text' => $message,
                'parse_mode' => 'Markdown',
            ],
            'timeout' => 30,
        ]);

        return !is_wp_error($response);
    }

    public static function schedule_daily_topic() {
        if (!wp_next_scheduled('med_edu_daily_telegram_event')) {
            $hour = (int)get_option('med_edu_telegram_daily_hour', 9);
            $timestamp = strtotime("today $hour:00:00");
            if ($timestamp < time()) $timestamp += DAY_IN_SECONDS;
            wp_schedule_event($timestamp, 'daily', 'med_edu_daily_telegram_event');
        }
    }
}

add_action('med_edu_daily_telegram_event', ['MedEduTelegram', 'do_daily_send']);

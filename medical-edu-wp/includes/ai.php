<?php
if (!defined('ABSPATH')) exit;

class MedEduAI {
    public static function generate_topic($title, $topic_id = null) {
        $api_key = self::get_api_key();
        if (!$api_key) return new WP_Error('no_api_key', 'Gemini API key not found');

        $system_prompt = get_option('med_edu_system_prompt', 'تو یک استاد دانشگاه پزشکی فارسی‌زبان هستی. فقط به فارسی پاسخ بده.');
        $prompt_template = get_option('med_edu_prompt_generate_topic', 'لطفاً یک مبحث آموزشی کامل درباره‌ی «{{title}}» تولید کن.');

        $prompt = str_replace('{{title}}', $title, $prompt_template);

        $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" . $api_key;

        $body = [
            'contents' => [
                ['parts' => [['text' => $system_prompt . "\n\n" . $prompt]]]
            ]
        ];

        $response = wp_remote_post($url, [
            'body' => json_encode($body),
            'headers' => ['Content-Type' => 'application/json'],
            'timeout' => 60,
        ]);

        if (is_wp_error($response)) return $response;

        $res_body = json_decode(wp_remote_retrieve_body($response), true);
        $content = $res_body['candidates'][0]['content']['parts'][0]['text'] ?? '';

        if (!$content) return new WP_Error('ai_failed', 'Failed to generate content');

        return $content;
    }

    private static function get_api_key() {
        return get_option('med_edu_gemini_api_key');
    }
}

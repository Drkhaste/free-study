<?php
if (!defined('ABSPATH')) exit;

class MedEduAI {
    public static function generate_topic($title) {
        return self::gemini_call('prompt_generate_topic', ['title' => $title]);
    }

    public static function improve_content($content) {
        return self::gemini_call('prompt_improve', ['content' => $content]);
    }

    public static function summarize_content($content) {
        return self::gemini_call('prompt_summarize', ['content' => $content]);
    }

    private static function gemini_call($prompt_key, $vars) {
        $api_key = get_option('med_edu_gemini_api_key');
        if (!$api_key) return new WP_Error('no_api_key', 'API Key not found');

        $system_prompt = get_option('med_edu_system_prompt', 'تو یک استاد دانشگاه پزشکی فارسی‌زبان هستی.');
        $template = get_option('med_edu_' . $prompt_key);
        if (!$template) {
            // Default prompts if not set
            $defaults = [
                'prompt_generate_topic' => 'یک مبحث کامل درباره {{title}} بنویس.',
                'prompt_improve' => 'متن زیر را بهبود بده:\n{{content}}',
                'prompt_summarize' => 'خلاصه کن:\n{{content}}'
            ];
            $template = $defaults[$prompt_key];
        }

        $prompt = $template;
        foreach ($vars as $key => $val) {
            $prompt = str_replace('{{' . $key . '}}', $val, $prompt);
        }

        $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" . $api_key;
        $body = [
            'contents' => [['parts' => [['text' => $system_prompt . "\n\n" . $prompt]]]]
        ];

        $response = wp_remote_post($url, [
            'body' => json_encode($body),
            'headers' => ['Content-Type' => 'application/json'],
            'timeout' => 60,
        ]);

        if (is_wp_error($response)) return $response;

        $res_body = json_decode(wp_remote_retrieve_body($response), true);
        $content = $res_body['candidates'][0]['content']['parts'][0]['text'] ?? '';

        // Log the AI call
        global $wpdb;
        $wpdb->insert($wpdb->prefix . 'med_edu_ai_logs', [
            'user_id' => get_current_user_id(),
            'prompt' => substr($prompt, 0, 500),
            'response_excerpt' => substr($content, 0, 500),
            'model' => 'gemini-1.5-flash',
            'status' => $content ? 'success' : 'error',
            'created_at' => current_time('mysql')
        ]);

        return $content;
    }
}

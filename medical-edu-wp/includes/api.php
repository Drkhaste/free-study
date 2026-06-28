<?php
if (!defined('ABSPATH')) exit;

class MedEduAPI {
    public function __construct() {
        add_action('rest_api_init', [$this, 'register_routes']);
    }

    public function register_routes() {
        $namespace = 'medical-edu/v1';

        // Auth
        register_rest_route($namespace, '/auth/me', [
            'methods' => ['GET', 'PUT'],
            'callback' => [$this, 'handle_me'],
            'permission_callback' => 'is_user_logged_in',
        ]);
        register_rest_route($namespace, '/auth/logout', [
            'methods' => 'POST',
            'callback' => [$this, 'logout'],
            'permission_callback' => 'is_user_logged_in',
        ]);

        // Projects
        register_rest_route($namespace, '/projects', [
            'methods' => ['GET', 'POST'],
            'callback' => [$this, 'handle_projects'],
            'permission_callback' => [$this, 'check_admin'],
        ]);
        register_rest_route($namespace, '/projects/(?P<id>\d+)', [
            'methods' => ['GET', 'PUT', 'PATCH', 'DELETE'],
            'callback' => [$this, 'handle_project'],
            'permission_callback' => [$this, 'check_admin'],
        ]);

        // Topics
        register_rest_route($namespace, '/topics', [
            'methods' => ['GET', 'POST'],
            'callback' => [$this, 'handle_topics'],
            'permission_callback' => [$this, 'check_admin'],
        ]);
        register_rest_route($namespace, '/topics/(?P<id>\d+)', [
            'methods' => ['GET', 'PUT', 'PATCH', 'DELETE'],
            'callback' => [$this, 'handle_topic'],
            'permission_callback' => [$this, 'check_admin'],
        ]);
        register_rest_route($namespace, '/topics/(?P<id>\d+)/publish', [
            'methods' => 'POST',
            'callback' => [$this, 'publish_topic'],
            'permission_callback' => [$this, 'check_admin'],
        ]);

        // Flashcards
        register_rest_route($namespace, '/flashcards', [
            'methods' => ['GET', 'POST'],
            'callback' => [$this, 'handle_flashcards'],
            'permission_callback' => [$this, 'check_admin'],
        ]);
        register_rest_route($namespace, '/flashcards/(?P<id>\d+)', [
            'methods' => ['DELETE'],
            'callback' => [$this, 'delete_flashcard'],
            'permission_callback' => [$this, 'check_admin'],
        ]);
        register_rest_route($namespace, '/flashcards/(?P<id>\d+)/reset', [
            'methods' => 'POST',
            'callback' => [$this, 'reset_flashcard'],
            'permission_callback' => [$this, 'check_admin'],
        ]);
        register_rest_route($namespace, '/flashcards/stats/overview', [
            'methods' => 'GET',
            'callback' => [$this, 'get_stats_overview'],
            'permission_callback' => [$this, 'check_admin'],
        ]);
        register_rest_route($namespace, '/flashcards/import-csv', [
            'methods' => 'POST',
            'callback' => [$this, 'import_csv'],
            'permission_callback' => [$this, 'check_admin'],
        ]);

        // Review (SM-2)
        register_rest_route($namespace, '/review/queue', [
            'methods' => 'GET',
            'callback' => [$this, 'get_review_queue'],
            'permission_callback' => [$this, 'check_admin'],
        ]);
        register_rest_route($namespace, '/review/quick-answer', [
            'methods' => 'POST',
            'callback' => [$this, 'quick_answer_card'],
            'permission_callback' => [$this, 'check_admin'],
        ]);
        register_rest_route($namespace, '/review/(?P<session_id>\d+)/answer', [
            'methods' => 'POST',
            'callback' => [$this, 'answer_card'],
            'permission_callback' => [$this, 'check_admin'],
        ]);
        register_rest_route($namespace, '/review/(?P<session_id>\d+)/end', [
            'methods' => 'POST',
            'callback' => [$this, 'end_review_session'],
            'permission_callback' => [$this, 'check_admin'],
        ]);

        // AI (Gemini)
        register_rest_route($namespace, '/ai/generate-topic', [
            'methods' => 'POST',
            'callback' => [$this, 'ai_generate_topic'],
            'permission_callback' => [$this, 'check_admin'],
        ]);
        register_rest_route($namespace, '/ai/improve', [
            'methods' => 'POST',
            'callback' => [$this, 'ai_improve'],
            'permission_callback' => [$this, 'check_admin'],
        ]);
        register_rest_route($namespace, '/ai/logs', [
            'methods' => 'GET',
            'callback' => [$this, 'get_ai_logs'],
            'permission_callback' => [$this, 'check_admin'],
        ]);

        // Settings
        register_rest_route($namespace, '/settings', [
            'methods' => ['GET', 'PUT'],
            'callback' => [$this, 'handle_settings'],
            'permission_callback' => [$this, 'check_admin'],
        ]);
        register_rest_route($namespace, '/settings/test-telegram', [
            'methods' => 'POST',
            'callback' => [$this, 'test_telegram'],
            'permission_callback' => [$this, 'check_admin'],
        ]);

        // Tasks
        register_rest_route($namespace, '/tasks', [
            'methods' => ['GET', 'POST'],
            'callback' => [$this, 'handle_tasks'],
            'permission_callback' => [$this, 'check_admin'],
        ]);
        register_rest_route($namespace, '/tasks/(?P<id>\d+)', [
            'methods' => ['PATCH', 'PUT', 'DELETE'],
            'callback' => [$this, 'handle_task'],
            'permission_callback' => [$this, 'check_admin'],
        ]);
    }

    public function check_admin() {
        return current_user_can('manage_options');
    }

    // --- Implementation of Callbacks ---

    public function handle_me($request) {
        $user = wp_get_current_user();
        if ($request->get_method() === 'PUT') {
            $params = $request->get_json_params();
            if (isset($params['display_name'])) {
                wp_update_user(['ID' => $user->ID, 'display_name' => $params['display_name']]);
            }
            if (isset($params['email'])) {
                wp_update_user(['ID' => $user->ID, 'user_email' => $params['email']]);
            }
            $user = wp_get_current_user();
        }
        return new WP_REST_Response([
            'user' => [
                'id' => $user->ID,
                'username' => $user->user_login,
                'display_name' => $user->display_name,
                'email' => $user->user_email,
                'role' => in_array('administrator', $user->roles) ? 'admin' : 'user',
            ]
        ], 200);
    }

    public function logout() {
        wp_logout();
        return new WP_REST_Response(['ok' => true], 200);
    }

    public function handle_projects($request) {
        $user_id = get_current_user_id();
        if ($request->get_method() === 'POST') {
            $params = $request->get_json_params();
            $post_id = wp_insert_post([
                'post_title' => $params['title'],
                'post_type' => 'medical_project',
                'post_status' => 'publish',
                'post_author' => $user_id,
            ]);
            update_post_meta($post_id, '_description', $params['description'] ?? '');
            update_post_meta($post_id, '_color', $params['color'] ?? '#3b82f6');
            return new WP_REST_Response(['project' => ['id' => $post_id, 'title' => $params['title']]], 201);
        }

        $posts = get_posts(['post_type' => 'medical_project', 'author' => $user_id, 'posts_per_page' => -1]);
        $projects = array_map(function($post) {
            return [
                'id' => $post->ID,
                'title' => $post->post_title,
                'description' => get_post_meta($post->ID, '_description', true),
                'color' => get_post_meta($post->ID, '_color', true) ?: '#3b82f6',
                'topic_count' => $this->count_topics($post->ID),
                'flashcard_count' => $this->count_flashcards($post->ID),
            ];
        }, $posts);
        return new WP_REST_Response(['projects' => $projects], 200);
    }

    public function handle_project($request) {
        $id = $request['id'];
        $user_id = get_current_user_id();
        $post = get_post($id);
        if (!$post || $post->post_author != $user_id) return new WP_Error('not_found', 'Not found', ['status' => 404]);

        if ($request->get_method() === 'DELETE') {
            wp_delete_post($id, true);
            return new WP_REST_Response(['ok' => true], 200);
        }

        if (in_array($request->get_method(), ['PUT', 'PATCH'])) {
            $params = $request->get_json_params();
            $post_data = ['ID' => $id];
            if (isset($params['title'])) $post_data['post_title'] = $params['title'];
            wp_update_post($post_data);
            if (isset($params['description'])) update_post_meta($id, '_description', $params['description']);
            if (isset($params['color'])) update_post_meta($id, '_color', $params['color']);
            return new WP_REST_Response(['ok' => true], 200);
        }

        return new WP_REST_Response(['project' => [
            'id' => $post->ID,
            'title' => $post->post_title,
            'description' => get_post_meta($post->ID, '_description', true),
            'color' => get_post_meta($post->ID, '_color', true),
        ]], 200);
    }

    private function count_topics($project_id) {
        return count(get_posts(['post_type' => 'medical_topic', 'meta_key' => '_project_id', 'meta_value' => $project_id, 'posts_per_page' => -1, 'fields' => 'ids']));
    }

    private function count_flashcards($project_id) {
        global $wpdb;
        $table = $wpdb->prefix . 'med_edu_flashcards';
        return (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $table WHERE project_id = %d", $project_id));
    }

    public function handle_topics($request) {
        $user_id = get_current_user_id();
        if ($request->get_method() === 'POST') {
            $params = $request->get_json_params();
            $post_id = wp_insert_post([
                'post_title' => $params['title'],
                'post_content' => $params['content_md'] ?? '',
                'post_type' => 'medical_topic',
                'post_status' => (isset($params['status']) && $params['status'] === 'published') ? 'publish' : 'draft',
                'post_author' => $user_id,
            ]);
            update_post_meta($post_id, '_project_id', $params['project_id']);
            update_post_meta($post_id, '_tags', $params['tags'] ?? '');
            update_post_meta($post_id, '_content_md', $params['content_md'] ?? '');
            return new WP_REST_Response(['topic' => ['id' => $post_id]], 201);
        }

        $project_id = $request->get_param('project_id');
        $q = $request->get_param('q');
        $args = ['post_type' => 'medical_topic', 'author' => $user_id, 'posts_per_page' => -1];
        if ($project_id) $args['meta_query'] = [['key' => '_project_id', 'value' => $project_id]];
        if ($q) $args['s'] = $q;

        $posts = get_posts($args);
        $topics = array_map(function($post) {
            return [
                'id' => $post->ID,
                'title' => $post->post_title,
                'project_id' => get_post_meta($post->ID, '_project_id', true),
                'excerpt' => $post->post_excerpt ?: wp_trim_words($post->post_content, 20),
                'status' => $post->post_status === 'publish' ? 'published' : 'draft',
                'tags' => get_post_meta($post->ID, '_tags', true),
                'word_count' => str_word_count(strip_tags($post->post_content)),
            ];
        }, $posts);
        return new WP_REST_Response(['topics' => $topics], 200);
    }

    public function handle_topic($request) {
        $id = $request['id'];
        $user_id = get_current_user_id();
        $post = get_post($id);
        if (!$post || $post->post_type !== 'medical_topic' || $post->post_author != $user_id) return new WP_Error('not_found', 'Not found', ['status' => 404]);

        if ($request->get_method() === 'DELETE') {
            wp_delete_post($id, true);
            return new WP_REST_Response(['ok' => true], 200);
        }

        if (in_array($request->get_method(), ['PUT', 'PATCH'])) {
            $params = $request->get_json_params();
            $post_data = ['ID' => $id];
            if (isset($params['title'])) $post_data['post_title'] = $params['title'];
            if (isset($params['content_md'])) {
                $post_data['post_content'] = $params['content_md'];
                update_post_meta($id, '_content_md', $params['content_md']);
            }
            if (isset($params['status'])) $post_data['post_status'] = $params['status'] === 'published' ? 'publish' : 'draft';
            wp_update_post($post_data);
            if (isset($params['tags'])) update_post_meta($id, '_tags', $params['tags']);
            return new WP_REST_Response(['topic' => ['id' => $id]], 200);
        }

        return new WP_REST_Response(['topic' => [
            'id' => $post->ID,
            'title' => $post->post_title,
            'content_md' => get_post_meta($post->ID, '_content_md', true) ?: $post->post_content,
            'content_html' => apply_filters('the_content', $post->post_content),
            'project_id' => get_post_meta($post->ID, '_project_id', true),
            'project_title' => get_the_title(get_post_meta($post->ID, '_project_id', true)),
            'tags' => get_post_meta($post->ID, '_tags', true),
            'status' => $post->post_status === 'publish' ? 'published' : 'draft',
            'word_count' => str_word_count(strip_tags($post->post_content)),
        ]], 200);
    }

    public function publish_topic($request) {
        $id = $request['id'];
        $post = get_post($id);
        if (!$post) return new WP_Error('not_found', 'Not found', ['status' => 404]);
        $blog_post_id = get_post_meta($id, '_blog_post_id', true);
        $post_data = ['post_title' => $post->post_title, 'post_content' => $post->post_content, 'post_status' => 'publish', 'post_type' => 'post', 'post_author' => $post->post_author];
        if ($blog_post_id && get_post($blog_post_id)) { $post_data['ID'] = $blog_post_id; wp_update_post($post_data); }
        else { $blog_post_id = wp_insert_post($post_data); update_post_meta($id, '_blog_post_id', $blog_post_id); }
        wp_update_post(['ID' => $id, 'post_status' => 'publish']);
        return new WP_REST_Response(['ok' => true], 200);
    }

    public function handle_flashcards($request) {
        global $wpdb;
        $user_id = get_current_user_id();
        $table = $wpdb->prefix . 'med_edu_flashcards';
        if ($request->get_method() === 'POST') {
            $params = $request->get_json_params();
            $wpdb->insert($table, ['user_id' => $user_id, 'project_id' => $params['project_id'], 'topic_id' => $params['topic_id'], 'front' => $params['front'], 'back' => $params['back'], 'hint' => $params['hint'] ?? '', 'tags' => $params['tags'] ?? '']);
            return new WP_REST_Response(['id' => $wpdb->insert_id], 201);
        }
        $topic_id = $request->get_param('topic_id');
        $sql = "SELECT * FROM $table WHERE user_id = %d";
        $binds = [$user_id];
        if ($topic_id) { $sql .= " AND topic_id = %d"; $binds[] = $topic_id; }
        $results = $wpdb->get_results($wpdb->prepare($sql, ...$binds));
        return new WP_REST_Response(['flashcards' => $results], 200);
    }

    public function delete_flashcard($request) {
        global $wpdb;
        $wpdb->delete($wpdb->prefix . 'med_edu_flashcards', ['id' => $request['id']]);
        return new WP_REST_Response(['ok' => true], 200);
    }

    public function reset_flashcard($request) {
        global $wpdb;
        $wpdb->update($wpdb->prefix . 'med_edu_flashcards', ['ease' => 2.5, 'interval_days' => 0, 'repetitions' => 0, 'next_review_at' => current_time('mysql')], ['id' => $request['id']]);
        return new WP_REST_Response(['ok' => true], 200);
    }

    public function get_stats_overview() {
        global $wpdb;
        $user_id = get_current_user_id();
        $table = $wpdb->prefix . 'med_edu_flashcards';
        $now = current_time('mysql');
        $total = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $table WHERE user_id = %d", $user_id));
        $due = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $table WHERE user_id = %d AND next_review_at <= %s", $user_id, $now));
        $learned = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $table WHERE user_id = %d AND repetitions >= 3", $user_id));
        return new WP_REST_Response(['total' => (int)$total, 'due' => (int)$due, 'learned' => (int)$learned], 200);
    }

    public function get_review_queue($request) {
        global $wpdb;
        $user_id = get_current_user_id();
        $table = $wpdb->prefix . 'med_edu_flashcards';
        $now = current_time('mysql');
        $queue = $wpdb->get_results($wpdb->prepare("SELECT * FROM $table WHERE user_id = %d AND next_review_at <= %s ORDER BY next_review_at ASC LIMIT 50", $user_id, $now));

        $table_sessions = $wpdb->prefix . 'med_edu_review_sessions';
        $wpdb->insert($table_sessions, ['user_id' => $user_id, 'started_at' => current_time('mysql')]);
        return new WP_REST_Response(['queue' => $queue, 'session_id' => $wpdb->insert_id], 200);
    }

    public function quick_answer_card($request) {
        global $wpdb;
        $params = $request->get_json_params();
        $card_id = $params['card_id'];
        $level = $params['level'];
        $table = $wpdb->prefix . 'med_edu_flashcards';
        $card = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id = %d", $card_id), ARRAY_A);
        require_once MED_EDU_PATH . 'includes/sm2.php';
        $result = MedEduSM2::calculate(['ease' => $card['ease'], 'interval' => $card['interval_days'], 'repetitions' => $card['repetitions']], MedEduSM2::get_quality_by_button($level));
        $wpdb->update($table, ['ease' => $result['ease'], 'interval_days' => $result['interval'], 'repetitions' => $result['repetitions'], 'next_review_at' => $result['next_review_at'], 'last_reviewed_at' => current_time('mysql')], ['id' => $card_id]);
        return new WP_REST_Response(['ok' => true], 200);
    }

    public function answer_card($request) {
        global $wpdb;
        $params = $request->get_json_params();
        $card_id = $params['card_id'];
        $button = $params['button'];
        $session_id = $request['session_id'];
        $table = $wpdb->prefix . 'med_edu_flashcards';
        $card = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id = %d", $card_id), ARRAY_A);
        require_once MED_EDU_PATH . 'includes/sm2.php';
        $quality = MedEduSM2::get_quality_by_button($button);
        $result = MedEduSM2::calculate(['ease' => $card['ease'], 'interval' => $card['interval_days'], 'repetitions' => $card['repetitions']], $quality);
        $wpdb->update($table, ['ease' => $result['ease'], 'interval_days' => $result['interval'], 'repetitions' => $result['repetitions'], 'next_review_at' => $result['next_review_at'], 'last_reviewed_at' => current_time('mysql')], ['id' => $card_id]);

        $table_sessions = $wpdb->prefix . 'med_edu_review_sessions';
        $wpdb->query($wpdb->prepare("UPDATE $table_sessions SET cards_reviewed = cards_reviewed + 1, cards_correct = cards_correct + %d WHERE id = %d", ($quality >= 3 ? 1 : 0), $session_id));
        return new WP_REST_Response(['ok' => true, 'interval_days' => $result['interval']], 200);
    }

    public function end_review_session($request) {
        global $wpdb;
        $session_id = $request['session_id'];
        $wpdb->update($wpdb->prefix . 'med_edu_review_sessions', ['ended_at' => current_time('mysql')], ['id' => $session_id]);
        return new WP_REST_Response(['ok' => true], 200);
    }

    public function ai_generate_topic($request) {
        require_once MED_EDU_PATH . 'includes/ai.php';
        $params = $request->get_json_params();
        $content = MedEduAI::generate_topic($params['title']);
        if (is_wp_error($content)) return $content;
        return new WP_REST_Response(['content_md' => $content], 200);
    }

    public function ai_improve($request) {
        require_once MED_EDU_PATH . 'includes/ai.php';
        $params = $request->get_json_params();
        $content = MedEduAI::improve_content($params['content']);
        if (is_wp_error($content)) return $content;
        return new WP_REST_Response(['content_md' => $content], 200);
    }

    public function get_ai_logs() {
        global $wpdb;
        $logs = $wpdb->get_results($wpdb->prepare("SELECT * FROM " . $wpdb->prefix . "med_edu_ai_logs WHERE user_id = %d ORDER BY created_at DESC LIMIT 20", get_current_user_id()));
        return new WP_REST_Response(['logs' => $logs], 200);
    }

    public function handle_settings($request) {
        if ($request->get_method() === 'PUT') {
            $params = $request->get_json_params();
            foreach ($params as $key => $val) update_option('med_edu_' . $key, $val);
            return new WP_REST_Response(['ok' => true], 200);
        }
        return new WP_REST_Response(['settings' => [
            'site_title' => get_option('med_edu_site_title', get_bloginfo('name')),
            'site_description' => get_option('med_edu_site_description', get_bloginfo('description')),
            'gemini_api_key' => get_option('med_edu_gemini_api_key', ''),
            'telegram_bot_token' => get_option('med_edu_telegram_bot_token', ''),
            'telegram_channel_id' => get_option('med_edu_telegram_channel_id', ''),
            'telegram_daily_hour' => get_option('med_edu_telegram_daily_hour', '9'),
            'dashboard_url' => get_option('med_edu_dashboard_url', ''),
            'system_prompt' => get_option('med_edu_system_prompt', ''),
            'prompt_generate_topic' => get_option('med_edu_prompt_generate_topic', ''),
            'prompt_improve' => get_option('med_edu_prompt_improve', ''),
            'prompt_summarize' => get_option('med_edu_prompt_summarize', ''),
        ]], 200);
    }

    public function test_telegram() {
        require_once MED_EDU_PATH . 'includes/telegram.php';
        $ok = MedEduTelegram::send_message("تست اتصال از وردپرس ✅");
        return new WP_REST_Response(['ok' => $ok], 200);
    }

    public function handle_tasks($request) {
        global $wpdb;
        $user_id = get_current_user_id();
        $table = $wpdb->prefix . 'med_edu_tasks';
        if ($request->get_method() === 'POST') {
            $params = $request->get_json_params();
            $wpdb->insert($table, ['user_id' => $user_id, 'title' => $params['title'], 'description' => $params['description'] ?? '', 'task_date' => $params['task_date'], 'status' => 'pending']);
            return new WP_REST_Response(['id' => $wpdb->insert_id], 201);
        }
        $month = $request->get_param('month');
        $sql = "SELECT * FROM $table WHERE user_id = %d"; $binds = [$user_id];
        if ($month) { $sql .= " AND task_date LIKE %s"; $binds[] = $month . '%'; }
        $results = $wpdb->get_results($wpdb->prepare($sql, ...$binds));
        return new WP_REST_Response(['tasks' => $results], 200);
    }

    public function handle_task($request) {
        global $wpdb;
        $id = $request['id'];
        if ($request->get_method() === 'DELETE') {
            $wpdb->delete($wpdb->prefix . 'med_edu_tasks', ['id' => $id]);
            return new WP_REST_Response(['ok' => true], 200);
        }
        $wpdb->update($wpdb->prefix . 'med_edu_tasks', $request->get_json_params(), ['id' => $id]);
        return new WP_REST_Response(['ok' => true], 200);
    }

    public function import_csv($request) {
        global $wpdb;
        $params = $request->get_json_params();
        $text = $params['csv_text'];
        $topic_id = $params['topic_id'];
        $project_id = $params['project_id'];
        $lines = explode("\n", $text);
        $imported = 0;
        $table = $wpdb->prefix . 'med_edu_flashcards';
        foreach ($lines as $line) {
            $data = str_getcsv($line);
            if (count($data) < 2 || $data[0] === 'front') continue;
            $wpdb->insert($table, ['user_id' => get_current_user_id(), 'project_id' => $project_id, 'topic_id' => $topic_id, 'front' => $data[0], 'back' => $data[1], 'hint' => $data[2] ?? '', 'tags' => $data[3] ?? '']);
            $imported++;
        }
        return new WP_REST_Response(['imported' => $imported], 200);
    }
}

new MedEduAPI();

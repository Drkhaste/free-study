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
            'methods' => 'GET',
            'callback' => [$this, 'get_me'],
            'permission_callback' => 'is_user_logged_in',
        ]);
        register_rest_route($namespace, '/auth/logout', [
            'methods' => 'POST',
            'callback' => [$this, 'logout'],
            'permission_callback' => 'is_user_logged_in',
        ]);

        // Projects
        register_rest_route($namespace, '/projects', [
            'methods' => 'GET',
            'callback' => [$this, 'get_projects'],
            'permission_callback' => [$this, 'check_admin'],
        ]);
        register_rest_route($namespace, '/projects', [
            'methods' => 'POST',
            'callback' => [$this, 'create_project'],
            'permission_callback' => [$this, 'check_admin'],
        ]);
        register_rest_route($namespace, '/projects/(?P<id>\d+)', [
            'methods' => ['PUT', 'PATCH'],
            'callback' => [$this, 'update_project'],
            'permission_callback' => [$this, 'check_admin'],
        ]);
        register_rest_route($namespace, '/projects/(?P<id>\d+)', [
            'methods' => 'DELETE',
            'callback' => [$this, 'delete_project'],
            'permission_callback' => [$this, 'check_admin'],
        ]);

        // Topics
        register_rest_route($namespace, '/topics', [
            'methods' => 'GET',
            'callback' => [$this, 'get_topics'],
            'permission_callback' => [$this, 'check_admin'],
        ]);
        register_rest_route($namespace, '/topics', [
            'methods' => 'POST',
            'callback' => [$this, 'create_topic'],
            'permission_callback' => [$this, 'check_admin'],
        ]);
        register_rest_route($namespace, '/topics/(?P<id>\d+)', [
            'methods' => 'GET',
            'callback' => [$this, 'get_topic'],
            'permission_callback' => [$this, 'check_admin'],
        ]);
        register_rest_route($namespace, '/topics/(?P<id>\d+)', [
            'methods' => ['PUT', 'PATCH'],
            'callback' => [$this, 'update_topic'],
            'permission_callback' => [$this, 'check_admin'],
        ]);
        register_rest_route($namespace, '/topics/(?P<id>\d+)', [
            'methods' => 'DELETE',
            'callback' => [$this, 'delete_topic'],
            'permission_callback' => [$this, 'check_admin'],
        ]);
        register_rest_route($namespace, '/topics/(?P<id>\d+)/publish', [
            'methods' => 'POST',
            'callback' => [$this, 'publish_topic'],
            'permission_callback' => [$this, 'check_admin'],
        ]);

        // Flashcards
        register_rest_route($namespace, '/flashcards', [
            'methods' => 'GET',
            'callback' => [$this, 'get_flashcards'],
            'permission_callback' => [$this, 'check_admin'],
        ]);
        register_rest_route($namespace, '/review/quick-answer', [
            'methods' => 'POST',
            'callback' => [$this, 'quick_answer_card'],
            'permission_callback' => [$this, 'check_admin'],
        ]);
        register_rest_route($namespace, '/flashcards', [
            'methods' => 'POST',
            'callback' => [$this, 'create_flashcard'],
            'permission_callback' => [$this, 'check_admin'],
        ]);
        register_rest_route($namespace, '/flashcards/(?P<id>\d+)', [
            'methods' => 'DELETE',
            'callback' => [$this, 'delete_flashcard'],
            'permission_callback' => [$this, 'check_admin'],
        ]);
        register_rest_route($namespace, '/flashcards/stats/overview', [
            'methods' => 'GET',
            'callback' => [$this, 'get_stats_overview'],
            'permission_callback' => [$this, 'check_admin'],
        ]);

        // Settings
        register_rest_route($namespace, '/settings', [
            'methods' => 'GET',
            'callback' => [$this, 'get_settings'],
            'permission_callback' => [$this, 'check_admin'],
        ]);
        register_rest_route($namespace, '/settings', [
            'methods' => 'PUT',
            'callback' => [$this, 'update_settings'],
            'permission_callback' => [$this, 'check_admin'],
        ]);

        // Tasks
        register_rest_route($namespace, '/tasks', [
            'methods' => 'GET',
            'callback' => [$this, 'get_tasks'],
            'permission_callback' => [$this, 'check_admin'],
        ]);
        register_rest_route($namespace, '/tasks', [
            'methods' => 'POST',
            'callback' => [$this, 'create_task'],
            'permission_callback' => [$this, 'check_admin'],
        ]);
        register_rest_route($namespace, '/tasks/(?P<id>\d+)', [
            'methods' => ['PATCH', 'PUT'],
            'callback' => [$this, 'update_task'],
            'permission_callback' => [$this, 'check_admin'],
        ]);
        register_rest_route($namespace, '/tasks/(?P<id>\d+)', [
            'methods' => 'DELETE',
            'callback' => [$this, 'delete_task'],
            'permission_callback' => [$this, 'check_admin'],
        ]);

        // Public Webhook
        register_rest_route($namespace, '/telegram/webhook', [
            'methods' => 'POST',
            'callback' => [$this, 'handle_telegram_webhook'],
            'permission_callback' => '__return_true', // Public
        ]);
    }

    public function check_admin() {
        return current_user_can('manage_options');
    }

    public function get_me() {
        $user = wp_get_current_user();
        return new WP_REST_Response([
            'user' => [
                'id' => $user->ID,
                'username' => $user->user_login,
                'display_name' => $user->display_name,
                'role' => in_array('administrator', $user->roles) ? 'admin' : 'user',
            ]
        ], 200);
    }

    public function logout() {
        wp_logout();
        return new WP_REST_Response(['ok' => true], 200);
    }

    // --- Projects ---
    public function get_projects() {
        $user_id = get_current_user_id();
        $posts = get_posts([
            'post_type' => 'medical_project',
            'author' => $user_id,
            'posts_per_page' => -1,
        ]);

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

    private function count_topics($project_id) {
        return count(get_posts([
            'post_type' => 'medical_topic',
            'meta_key' => '_project_id',
            'meta_value' => $project_id,
            'posts_per_page' => -1,
            'fields' => 'ids',
        ]));
    }

    private function count_flashcards($project_id) {
        global $wpdb;
        $table = $wpdb->prefix . 'med_edu_flashcards';
        return (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $table WHERE project_id = %d", $project_id));
    }

    public function create_project($request) {
        $params = $request->get_json_params();
        $user_id = get_current_user_id();
        $post_id = wp_insert_post([
            'post_title' => $params['title'],
            'post_type' => 'medical_project',
            'post_status' => 'publish',
            'post_author' => $user_id,
        ]);
        if (is_wp_error($post_id)) return new WP_Error('create_failed', 'Failed to create', ['status' => 500]);
        update_post_meta($post_id, '_description', $params['description'] ?? '');
        update_post_meta($post_id, '_color', $params['color'] ?? '#3b82f6');
        return new WP_REST_Response(['project' => ['id' => $post_id, 'title' => $params['title']]], 201);
    }

    public function update_project($request) {
        $id = $request['id'];
        $params = $request->get_json_params();
        $post_data = ['ID' => $id];
        if (isset($params['title'])) $post_data['post_title'] = $params['title'];
        wp_update_post($post_data);
        if (isset($params['description'])) update_post_meta($id, '_description', $params['description']);
        if (isset($params['color'])) update_post_meta($id, '_color', $params['color']);
        return new WP_REST_Response(['ok' => true], 200);
    }

    public function delete_project($request) {
        wp_delete_post($request['id'], true);
        return new WP_REST_Response(['ok' => true], 200);
    }

    // --- Topics ---
    public function get_topics($request) {
        $user_id = get_current_user_id();
        $project_id = $request->get_param('project_id');
        $q = $request->get_param('q');

        $args = [
            'post_type' => 'medical_topic',
            'author' => $user_id,
            'posts_per_page' => -1,
        ];

        if ($project_id) {
            $args['meta_query'] = [['key' => '_project_id', 'value' => $project_id]];
        }
        if ($q) {
            $args['s'] = $q;
        }

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

    public function get_topic($request) {
        $id = $request['id'];
        $post = get_post($id);
        if (!$post || $post->post_type !== 'medical_topic') return new WP_Error('not_found', 'Topic not found', ['status' => 404]);

        return new WP_REST_Response(['topic' => [
            'id' => $post->ID,
            'title' => $post->post_title,
            'content_md' => get_post_meta($post->ID, '_content_md', true) ?: $post->post_content,
            'content_html' => apply_filters('the_content', $post->post_content),
            'project_id' => get_post_meta($post->ID, '_project_id', true),
            'tags' => get_post_meta($post->ID, '_tags', true),
            'status' => $post->post_status === 'publish' ? 'published' : 'draft',
            'word_count' => str_word_count(strip_tags($post->post_content)),
        ]], 200);
    }

    public function create_topic($request) {
        $params = $request->get_json_params();
        $user_id = get_current_user_id();
        $post_id = wp_insert_post([
            'post_title' => $params['title'],
            'post_content' => $params['content_md'] ?? '',
            'post_type' => 'medical_topic',
            'post_status' => (isset($params['status']) && $params['status'] === 'published') ? 'publish' : 'draft',
            'post_author' => $user_id,
        ]);
        if (is_wp_error($post_id)) return new WP_Error('create_failed', 'Failed', ['status' => 500]);
        update_post_meta($post_id, '_project_id', $params['project_id']);
        update_post_meta($post_id, '_tags', $params['tags'] ?? '');
        update_post_meta($post_id, '_content_md', $params['content_md'] ?? '');
        return new WP_REST_Response(['topic' => ['id' => $post_id]], 201);
    }

    public function update_topic($request) {
        $id = $request['id'];
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

    public function delete_topic($request) {
        wp_delete_post($request['id'], true);
        return new WP_REST_Response(['ok' => true], 200);
    }

    public function publish_topic($request) {
        $id = $request['id'];
        $post = get_post($id);
        if (!$post || $post->post_type !== 'medical_topic') return new WP_Error('not_found', 'Topic not found', ['status' => 404]);

        $blog_post_id = get_post_meta($id, '_blog_post_id', true);
        $post_data = [
            'post_title'   => $post->post_title,
            'post_content' => $post->post_content,
            'post_status'  => 'publish',
            'post_type'    => 'post',
            'post_author'  => $post->post_author,
        ];
        if ($blog_post_id && get_post($blog_post_id)) {
            $post_data['ID'] = $blog_post_id;
            wp_update_post($post_data);
        } else {
            $blog_post_id = wp_insert_post($post_data);
            update_post_meta($id, '_blog_post_id', $blog_post_id);
            update_post_meta($blog_post_id, '_medical_topic_id', $id);
        }
        wp_update_post(['ID' => $id, 'post_status' => 'publish']);
        return new WP_REST_Response(['ok' => true, 'blog_post_id' => $blog_post_id], 200);
    }

    // --- Flashcards ---
    public function get_flashcards($request) {
        global $wpdb;
        $user_id = get_current_user_id();
        $topic_id = $request->get_param('topic_id');
        $table = $wpdb->prefix . 'med_edu_flashcards';
        $sql = "SELECT * FROM $table WHERE user_id = %d";
        $binds = [$user_id];
        if ($topic_id) {
            $sql .= " AND topic_id = %d";
            $binds[] = $topic_id;
        }
        $results = $wpdb->get_results($wpdb->prepare($sql, ...$binds));
        return new WP_REST_Response(['flashcards' => $results], 200);
    }

    public function quick_answer_card($request) {
        global $wpdb;
        $params = $request->get_json_params();
        $card_id = $params['card_id'];
        $level = $params['level'];
        $table = $wpdb->prefix . 'med_edu_flashcards';
        $card = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id = %d", $card_id), ARRAY_A);
        if (!$card) return new WP_Error('not_found', 'Card not found', ['status' => 404]);
        require_once MED_EDU_PATH . 'includes/sm2.php';
        $quality = MedEduSM2::get_quality_by_button($level);
        $result = MedEduSM2::calculate([
            'ease' => $card['ease'],
            'interval' => $card['interval_days'],
            'repetitions' => $card['repetitions'],
        ], $quality);
        $wpdb->update($table, [
            'ease' => $result['ease'],
            'interval_days' => $result['interval'],
            'repetitions' => $result['repetitions'],
            'next_review_at' => $result['next_review_at'],
            'last_reviewed_at' => current_time('mysql'),
            'total_reviews' => $card['total_reviews'] + 1,
            'correct_reviews' => $card['correct_reviews'] + ($quality >= 3 ? 1 : 0),
        ], ['id' => $card_id]);
        return new WP_REST_Response(['ok' => true, 'next_review' => $result['next_review_at']], 200);
    }

    public function create_flashcard($request) {
        global $wpdb;
        $params = $request->get_json_params();
        $user_id = get_current_user_id();
        $table = $wpdb->prefix . 'med_edu_flashcards';
        $wpdb->insert($table, [
            'user_id' => $user_id,
            'project_id' => $params['project_id'],
            'topic_id' => $params['topic_id'],
            'front' => $params['front'],
            'back' => $params['back'],
            'hint' => $params['hint'] ?? '',
            'tags' => $params['tags'] ?? '',
        ]);
        return new WP_REST_Response(['id' => $wpdb->insert_id], 201);
    }

    public function delete_flashcard($request) {
        global $wpdb;
        $table = $wpdb->prefix . 'med_edu_flashcards';
        $wpdb->delete($table, ['id' => $request['id']]);
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
        return new WP_REST_Response(['total' => (int)$total, 'due' => (int)$due, 'learned' => (int)$learned, 'reviewed' => 0], 200);
    }

    // --- Settings ---
    public function get_settings() {
        return new WP_REST_Response(['settings' => [
            'site_title' => get_option('med_edu_site_title', get_bloginfo('name')),
            'site_description' => get_option('med_edu_site_description', get_bloginfo('description')),
            'gemini_api_key' => get_option('med_edu_gemini_api_key', ''),
            'telegram_bot_token' => get_option('med_edu_telegram_bot_token', ''),
            'telegram_channel_id' => get_option('med_edu_telegram_channel_id', ''),
            'telegram_daily_hour' => get_option('med_edu_telegram_daily_hour', '9'),
        ]], 200);
    }

    public function update_settings($request) {
        $params = $request->get_json_params();
        foreach ($params as $key => $value) {
            update_option('med_edu_' . $key, $value);
        }
        return new WP_REST_Response(['ok' => true], 200);
    }

    // --- Tasks ---
    public function get_tasks($request) {
        global $wpdb;
        $user_id = get_current_user_id();
        $table = $wpdb->prefix . 'med_edu_tasks';
        $month = $request->get_param('month');
        $sql = "SELECT * FROM $table WHERE user_id = %d";
        $binds = [$user_id];
        if ($month) {
            $sql .= " AND task_date LIKE %s";
            $binds[] = $month . '%';
        }
        $results = $wpdb->get_results($wpdb->prepare($sql, ...$binds));
        return new WP_REST_Response(['tasks' => $results], 200);
    }

    public function create_task($request) {
        global $wpdb;
        $params = $request->get_json_params();
        $user_id = get_current_user_id();
        $table = $wpdb->prefix . 'med_edu_tasks';
        $wpdb->insert($table, [
            'user_id' => $user_id,
            'title' => $params['title'],
            'description' => $params['description'] ?? '',
            'task_date' => $params['task_date'],
            'status' => 'pending',
        ]);
        return new WP_REST_Response(['id' => $wpdb->insert_id], 201);
    }

    public function update_task($request) {
        global $wpdb;
        $id = $request['id'];
        $params = $request->get_json_params();
        $table = $wpdb->prefix . 'med_edu_tasks';
        $wpdb->update($table, $params, ['id' => $id]);
        return new WP_REST_Response(['ok' => true], 200);
    }

    public function delete_task($request) {
        global $wpdb;
        $table = $wpdb->prefix . 'med_edu_tasks';
        $wpdb->delete($table, ['id' => $request['id']]);
        return new WP_REST_Response(['ok' => true], 200);
    }

    public function handle_telegram_webhook($request) {
        // Simple logic for telegram webhook
        $body = $request->get_json_params();
        if (!$body) return new WP_REST_Response(['ok' => false], 400);

        // For now just return OK to avoid telegram retries
        return new WP_REST_Response(['ok' => true], 200);
    }
}

new MedEduAPI();

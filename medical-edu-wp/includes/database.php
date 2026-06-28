<?php
if (!defined('ABSPATH')) exit;

class MedEduDB {
    public static function create_tables() {
        global $wpdb;
        $charset_collate = $wpdb->get_charset_collate();

        // Flashcards table
        $table_flashcards = $wpdb->prefix . 'med_edu_flashcards';
        $sql_flashcards = "CREATE TABLE $table_flashcards (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) NOT NULL,
            project_id bigint(20),
            topic_id bigint(20),
            front text NOT NULL,
            back text NOT NULL,
            hint text,
            tags text,
            ease float DEFAULT 2.5,
            interval_days int(11) DEFAULT 0,
            repetitions int(11) DEFAULT 0,
            next_review_at datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
            last_reviewed_at datetime,
            total_reviews int(11) DEFAULT 0,
            correct_reviews int(11) DEFAULT 0,
            created_at datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY  (id),
            KEY user_id (user_id),
            KEY next_review_at (next_review_at)
        ) $charset_collate;";

        // Tasks table
        $table_tasks = $wpdb->prefix . 'med_edu_tasks';
        $sql_tasks = "CREATE TABLE $table_tasks (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) NOT NULL,
            title varchar(255) NOT NULL,
            description text,
            task_date date NOT NULL,
            status varchar(20) DEFAULT 'pending',
            created_at datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY  (id),
            KEY user_date (user_id, task_date)
        ) $charset_collate;";

        // AI Logs table
        $table_ai_logs = $wpdb->prefix . 'med_edu_ai_logs';
        $sql_ai_logs = "CREATE TABLE $table_ai_logs (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            user_id bigint(20),
            topic_id bigint(20),
            prompt text,
            response_excerpt text,
            model varchar(50),
            tokens_used int(11),
            status varchar(20),
            error_message text,
            created_at datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY  (id),
            KEY user_id (user_id)
        ) $charset_collate;";

        // Review Sessions table
        $table_sessions = $wpdb->prefix . 'med_edu_review_sessions';
        $sql_sessions = "CREATE TABLE $table_sessions (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) NOT NULL,
            started_at datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
            ended_at datetime,
            cards_reviewed int(11) DEFAULT 0,
            cards_correct int(11) DEFAULT 0,
            duration_sec int(11),
            PRIMARY KEY  (id),
            KEY user_id (user_id)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql_flashcards);
        dbDelta($sql_tasks);
        dbDelta($sql_ai_logs);
        dbDelta($sql_sessions);
    }
}

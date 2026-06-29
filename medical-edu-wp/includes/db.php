<?php

function med_edu_create_tables() {
	global $wpdb;
	$charset_collate = $wpdb->get_charset_collate();

	require_once ABSPATH . 'wp-admin/includes/upgrade.php';

	// Projects Table
	$table_projects = $wpdb->prefix . 'med_edu_projects';
	$sql_projects = "CREATE TABLE $table_projects (
		id bigint(20) NOT NULL AUTO_INCREMENT,
		user_id bigint(20) NOT NULL,
		title varchar(255) NOT NULL,
		description text,
		color varchar(20) DEFAULT '#3b82f6',
		icon varchar(50) DEFAULT 'folder',
		position int(11) DEFAULT 0,
		created_at datetime DEFAULT CURRENT_TIMESTAMP,
		updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (id),
		KEY user_id (user_id)
	) $charset_collate;";
	dbDelta( $sql_projects );

	// Flashcards Table
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
		ease double DEFAULT 2.5,
		`interval` int(11) DEFAULT 0,
		repetitions int(11) DEFAULT 0,
		next_review_at datetime NOT NULL,
		last_reviewed_at datetime,
		total_reviews int(11) DEFAULT 0,
		correct_reviews int(11) DEFAULT 0,
		created_at datetime DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (id),
		KEY user_id (user_id),
		KEY next_review_at (next_review_at),
		KEY project_id (project_id),
		KEY topic_id (topic_id)
	) $charset_collate;";
	dbDelta( $sql_flashcards );

	// Tasks Table
	$table_tasks = $wpdb->prefix . 'med_edu_tasks';
	$sql_tasks = "CREATE TABLE $table_tasks (
		id bigint(20) NOT NULL AUTO_INCREMENT,
		user_id bigint(20) NOT NULL,
		title varchar(255) NOT NULL,
		description text,
		task_date date NOT NULL,
		status varchar(20) DEFAULT 'pending',
		created_at datetime DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (id),
		KEY user_id_date (user_id, task_date)
	) $charset_collate;";
	dbDelta( $sql_tasks );

	// Settings Table (User specific)
	$table_settings = $wpdb->prefix . 'med_edu_settings';
	$sql_settings = "CREATE TABLE $table_settings (
		user_id bigint(20) NOT NULL,
		`key` varchar(100) NOT NULL,
		`value` longtext,
		updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (user_id, `key`)
	) $charset_collate;";
	dbDelta( $sql_settings );

	// AI Logs Table
	$table_ai_logs = $wpdb->prefix . 'med_edu_ai_logs';
	$sql_ai_logs = "CREATE TABLE $table_ai_logs (
		id bigint(20) NOT NULL AUTO_INCREMENT,
		user_id bigint(20),
		topic_id bigint(20),
		prompt text,
		response_excerpt text,
		model varchar(100),
		tokens_used int(11),
		status varchar(20),
		error_message text,
		created_at datetime DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (id),
		KEY user_id (user_id)
	) $charset_collate;";
	dbDelta( $sql_ai_logs );

	// Review Sessions Table
	$table_review_sessions = $wpdb->prefix . 'med_edu_review_sessions';
	$sql_review_sessions = "CREATE TABLE $table_review_sessions (
		id bigint(20) NOT NULL AUTO_INCREMENT,
		user_id bigint(20) NOT NULL,
		started_at datetime DEFAULT CURRENT_TIMESTAMP,
		ended_at datetime,
		cards_reviewed int(11) DEFAULT 0,
		cards_correct int(11) DEFAULT 0,
		duration_sec int(11),
		PRIMARY KEY (id),
		KEY user_id (user_id)
	) $charset_collate;";
	dbDelta( $sql_review_sessions );
}

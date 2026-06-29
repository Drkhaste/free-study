<?php

function med_edu_admin_menu() {
	add_menu_page(
		'آکادمی پزشکی',
		'آکادمی پزشکی',
		'manage_options',
		'medical-edu',
		'med_edu_admin_page',
		'dashicons-stethoscope',
		6
	);
}
add_action( 'admin_menu', 'med_edu_admin_menu' );

function med_edu_admin_page() {
	echo '<div id="app"></div>';
}

function med_edu_enqueue_scripts( $hook ) {
	if ( strpos( $hook, 'medical-edu' ) === false && ! is_page( 'medical-dashboard' ) ) {
		// Only enqueue on our admin page or frontend dashboard page
		return;
	}

	wp_enqueue_style( 'med-edu-tailwind', 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css' );
	wp_enqueue_style( 'med-edu-vazir', 'https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css' );
	wp_enqueue_style( 'med-edu-easymde-css', 'https://unpkg.com/easymde/dist/easymde.min.css' );
	wp_enqueue_style( 'med-edu-app-css', MED_EDU_URL . 'assets/app.css', array(), MED_EDU_VERSION );

	wp_enqueue_script( 'med-edu-easymde-js', 'https://unpkg.com/easymde/dist/easymde.min.js', array(), null, true );
	wp_enqueue_script( 'med-edu-moment', 'https://cdn.jsdelivr.net/npm/moment@2.29.4/moment.min.js', array(), null, true );
	wp_enqueue_script( 'med-edu-jalali-moment', 'https://cdn.jsdelivr.net/npm/jalali-moment@3.3.11/dist/jalali-moment.browser.js', array( 'med-edu-moment' ), null, true );

	wp_enqueue_script( 'med-edu-app-js', MED_EDU_URL . 'assets/app.js', array( 'jquery', 'wp-api' ), MED_EDU_VERSION, true );

	$user = wp_get_current_user();
	wp_localize_script( 'med-edu-app-js', 'medEduData', array(
		'root' => esc_url_raw( rest_url() ),
		'nonce' => wp_create_nonce( 'wp_rest' ),
		'user' => is_user_logged_in() ? array(
			'username' => $user->user_login,
			'display_name' => $user->display_name,
			'role' => in_array( 'administrator', (array) $user->roles ) ? 'admin' : 'user',
		) : null,
		'logoutUrl' => wp_logout_url( home_url() ),
		'loginUrl' => wp_login_url( get_permalink() ),
		'homeUrl' => home_url(),
	) );
}
add_action( 'admin_enqueue_scripts', 'med_edu_enqueue_scripts' );
add_action( 'wp_enqueue_scripts', 'med_edu_enqueue_scripts' );

/**
 * Add Dashboard Widget
 */
function med_edu_add_dashboard_widget() {
	if ( current_user_can( 'manage_options' ) ) {
		wp_add_dashboard_widget(
			'med_edu_stats_widget',
			'وضعیت آکادمی پزشکی',
			'med_edu_dashboard_widget_content'
		);
	}
}
add_action( 'wp_dashboard_setup', 'med_edu_add_dashboard_widget' );

function med_edu_dashboard_widget_content() {
	global $wpdb;
	$user_id = get_current_user_id();
	$now = current_time( 'mysql' );

	$total_cards = $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$wpdb->prefix}med_edu_flashcards WHERE user_id = %d", $user_id ) );
	$due_cards = $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$wpdb->prefix}med_edu_flashcards WHERE user_id = %d AND next_review_at <= %s", $user_id, $now ) );
	$topics_count = $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type = 'medical_topic' AND post_author = %d", $user_id ) );

	echo '<div style="display: grid; grid-template-cols: 1fr 1fr; gap: 10px;">';
	echo '<div style="background: #f0f0f1; padding: 10px; border-radius: 5px; text-align: center;"><strong>' . $topics_count . '</strong><br><small>مبحث</small></div>';
	echo '<div style="background: #f0f0f1; padding: 10px; border-radius: 5px; text-align: center;"><strong>' . $total_cards . '</strong><br><small>فلش‌کارت</small></div>';
	echo '</div>';

	if ( $due_cards > 0 ) {
		echo '<p style="margin-top: 15px; color: #d63638; font-weight: bold;">⚠️ ' . $due_cards . ' فلش‌کارت آماده مرور دارید!</p>';
		echo '<a href="' . admin_url( 'admin.php?page=medical-edu&med_path=/review' ) . '" class="button button-primary">شروع مرور</a>';
	} else {
		echo '<p style="margin-top: 15px; color: #00a32a;">✅ تمام کارت‌ها مرور شده‌اند.</p>';
		echo '<a href="' . admin_url( 'admin.php?page=medical-edu' ) . '" class="button">ورود به پنل</a>';
	}
}

<?php

function med_edu_frontend_dashboard() {
	if ( is_page( 'medical-dashboard' ) ) {
		return '<div id="app"></div>';
	}
}
add_shortcode( 'medical_dashboard', 'med_edu_frontend_dashboard' );

// Create page on activation
function med_edu_create_dashboard_page() {
	$page_title = 'Medical Dashboard';
	$page_content = '[medical_dashboard]';
	$page_check = get_page_by_title( $page_title );

	if ( ! isset( $page_check->ID ) ) {
		wp_insert_post( array(
			'post_type'    => 'page',
			'post_title'   => $page_title,
			'post_content' => $page_content,
			'post_status'  => 'publish',
			'post_author'  => 1,
			'post_name'    => 'medical-dashboard'
		) );
	}
}
// Add to activation hook in main file

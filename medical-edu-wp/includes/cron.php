<?php

// Schedule daily Telegram notification
if ( ! wp_next_scheduled( 'med_edu_daily_telegram' ) ) {
	wp_schedule_event( time(), 'daily', 'med_edu_daily_telegram' );
}

add_action( 'med_edu_daily_telegram', 'med_edu_send_daily_telegram' );

function med_edu_send_daily_telegram() {
	// Logic to find a random topic and send it to Telegram for each user who has it configured
	global $wpdb;

	// This is a simplified version. In a real scenario, we might want to be more selective.
	$users = get_users( array( 'role' => 'administrator' ) );

	foreach ( $users as $user ) {
		$token = med_edu_get_setting( $user->ID, 'telegram_bot_token' );
		$chat_id = med_edu_get_setting( $user->ID, 'telegram_channel_id' );

		if ( ! $token || ! $chat_id ) continue;

		// Get a random published topic for this user
		$topic = $wpdb->get_row( $wpdb->prepare(
			"SELECT * FROM {$wpdb->posts} WHERE post_type = 'medical_topic' AND post_status = 'publish' AND post_author = %d ORDER BY RAND() LIMIT 1",
			$user->ID
		) );

		if ( $topic ) {
			$url = "https://api.telegram.org/bot$token/sendMessage";
			wp_remote_post( $url, array(
				'body' => array(
					'chat_id' => $chat_id,
					'text'    => "📚 مبحث پیشنهادی امروز:\n\n" . $topic->post_title . "\n\n" . get_permalink( $topic->ID ),
				)
			) );
		}
	}
}

<?php

class MED_EDU_Topics_Controller extends WP_REST_Controller {
	protected $namespace = 'medical-edu/v1';
	protected $rest_base = 'topics';

	public function register_routes() {
		register_rest_route( $this->namespace, '/' . $this->rest_base, array(
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_items' ),
				'permission_callback' => 'med_edu_rest_permission_check',
			),
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'create_item' ),
				'permission_callback' => 'med_edu_rest_permission_check',
			),
		) );

		register_rest_route( $this->namespace, '/' . $this->rest_base . '/(?P<id>[\d]+)', array(
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_item' ),
				'permission_callback' => 'med_edu_rest_permission_check',
			),
			array(
				'methods'             => WP_REST_Server::EDITABLE,
				'callback'            => array( $this, 'update_item' ),
				'permission_callback' => 'med_edu_rest_permission_check',
			),
			array(
				'methods'             => WP_REST_Server::DELETABLE,
				'callback'            => array( $this, 'delete_item' ),
				'permission_callback' => 'med_edu_rest_permission_check',
			),
		) );

		register_rest_route( $this->namespace, '/' . $this->rest_base . '/(?P<id>[\d]+)/highlight', array(
			'methods'             => WP_REST_Server::EDITABLE,
			'callback'            => array( $this, 'update_highlight' ),
			'permission_callback' => 'med_edu_rest_permission_check',
		) );

		register_rest_route( $this->namespace, '/' . $this->rest_base . '/(?P<id>[\d]+)/publish', array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => array( $this, 'publish_topic' ),
			'permission_callback' => 'med_edu_rest_permission_check',
		) );
	}

	public function get_items( $request ) {
		$user_id = get_current_user_id();
		$project_id = $request->get_param( 'project_id' );
		$q = $request->get_param( 'q' );

		$args = array(
			'post_type'      => 'medical_topic',
			'author'         => $user_id,
			'posts_per_page' => -1,
			's'              => $q,
		);

		if ( $project_id ) {
			$args['meta_query'] = array(
				array(
					'key'   => 'project_id',
					'value' => $project_id,
				),
			);
		}

		$query = new WP_Query( $args );
		$topics = array();

		foreach ( $query->posts as $post ) {
			$topics[] = $this->prepare_topic_for_response( $post );
		}

		return rest_ensure_response( array( 'topics' => $topics ) );
	}

	private function prepare_topic_for_response( $post ) {
		return array(
			'id'            => $post->ID,
			'project_id'    => get_post_meta( $post->ID, 'project_id', true ),
			'title'         => $post->post_title,
			'content_md'    => $post->post_content,
			'content_html'  => apply_filters( 'the_content', $post->post_content ),
			'excerpt'       => $post->post_excerpt,
			'tags'          => get_post_meta( $post->ID, 'tags', true ),
			'status'        => $post->post_status === 'publish' ? 'published' : 'draft',
			'word_count'    => str_word_count( strip_tags( $post->post_content ) ),
			'created_at'    => $post->post_date,
			'project_title' => $this->get_project_title( get_post_meta( $post->ID, 'project_id', true ) ),
		);
	}

	private function get_project_title( $id ) {
		global $wpdb;
		return $wpdb->get_var( $wpdb->prepare( "SELECT title FROM {$wpdb->prefix}med_edu_projects WHERE id = %d", $id ) );
	}

	public function create_item( $request ) {
		$user_id = get_current_user_id();
		$params = $request->get_json_params();

		$post_id = wp_insert_post( array(
			'post_title'   => $params['title'],
			'post_type'    => 'medical_topic',
			'post_status'  => 'draft',
			'post_author'  => $user_id,
			'post_content' => $params['content_md'] ?? '',
			'post_excerpt' => $params['excerpt'] ?? '',
		) );

		if ( is_wp_error( $post_id ) ) {
			return $post_id;
		}

		update_post_meta( $post_id, 'project_id', $params['project_id'] );
		update_post_meta( $post_id, 'tags', $params['tags'] ?? '' );

		return rest_ensure_response( array( 'topic' => array( 'id' => $post_id ) ) );
	}

	public function get_item( $request ) {
		$post = get_post( $request['id'] );
		if ( ! $post || $post->post_type !== 'medical_topic' ) {
			return new WP_Error( 'not_found', 'Topic not found', array( 'status' => 404 ) );
		}

		return rest_ensure_response( array( 'topic' => $this->prepare_topic_for_response( $post ) ) );
	}

	public function update_item( $request ) {
		$params = $request->get_json_params();
		$post_id = $request['id'];

		$update_args = array(
			'ID'         => $post_id,
			'post_title' => $params['title'],
		);

		if ( isset( $params['content_md'] ) ) {
			$update_args['post_content'] = $params['content_md'];
		}

		if ( isset( $params['status'] ) ) {
			$update_args['post_status'] = $params['status'] === 'published' ? 'publish' : 'draft';
		}

		wp_update_post( $update_args );

		if ( isset( $params['tags'] ) ) {
			update_post_meta( $post_id, 'tags', $params['tags'] );
		}

		return rest_ensure_response( array( 'topic' => array( 'id' => $post_id ) ) );
	}

	public function delete_item( $request ) {
		wp_delete_post( $request['id'], true );
		return rest_ensure_response( array( 'success' => true ) );
	}

	public function update_highlight( $request ) {
		$params = $request->get_json_params();
		$post_id = $request['id'];

		// In WordPress, we usually store content as post_content.
		// If we want to save HTML with highlights, we might need to be careful with sanitization.
		update_post_meta( $post_id, 'content_html_highlights', $params['html_content'] );

		return rest_ensure_response( array( 'success' => true ) );
	}

	public function publish_topic( $request ) {
		$post_id = $request['id'];
		wp_update_post( array(
			'ID'          => $post_id,
			'post_status' => 'publish',
		) );
		return rest_ensure_response( array( 'success' => true ) );
	}
}

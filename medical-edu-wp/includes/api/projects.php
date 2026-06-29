<?php

class MED_EDU_Projects_Controller extends WP_REST_Controller {
	protected $namespace = 'medical-edu/v1';
	protected $rest_base = 'projects';

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
	}

	public function get_items( $request ) {
		global $wpdb;
		$user_id = get_current_user_id();
		$table = $wpdb->prefix . 'med_edu_projects';

		$projects = $wpdb->get_results( $wpdb->prepare(
			"SELECT p.*,
			(SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type = 'medical_topic' AND post_author = %d AND ID IN (SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = 'project_id' AND meta_value = p.id)) as topic_count,
			(SELECT COUNT(*) FROM {$wpdb->prefix}med_edu_flashcards WHERE project_id = p.id) as flashcard_count
			FROM $table p WHERE user_id = %d ORDER BY position ASC, id DESC",
			$user_id, $user_id
		) );

		return rest_ensure_response( array( 'projects' => $projects ) );
	}

	public function create_item( $request ) {
		global $wpdb;
		$user_id = get_current_user_id();
		$params = $request->get_json_params();
		$table = $wpdb->prefix . 'med_edu_projects';

		$wpdb->insert( $table, array(
			'user_id'     => $user_id,
			'title'       => $params['title'],
			'description' => $params['description'] ?? '',
			'color'       => $params['color'] ?? '#3b82f6',
		) );

		$id = $wpdb->insert_id;
		return rest_ensure_response( array( 'project' => array( 'id' => $id ) ) );
	}

	public function get_item( $request ) {
		global $wpdb;
		$user_id = get_current_user_id();
		$id = $request['id'];
		$table = $wpdb->prefix . 'med_edu_projects';

		$project = $wpdb->get_row( $wpdb->prepare(
			"SELECT * FROM $table WHERE id = %d AND user_id = %d",
			$id, $user_id
		) );

		if ( ! $project ) {
			return new WP_Error( 'not_found', 'Project not found', array( 'status' => 404 ) );
		}

		return rest_ensure_response( array( 'project' => $project ) );
	}

	public function update_item( $request ) {
		global $wpdb;
		$user_id = get_current_user_id();
		$id = $request['id'];
		$params = $request->get_json_params();
		$table = $wpdb->prefix . 'med_edu_projects';

		$wpdb->update( $table, array(
			'title'       => $params['title'],
			'description' => $params['description'] ?? '',
			'color'       => $params['color'] ?? '#3b82f6',
		), array( 'id' => $id, 'user_id' => $user_id ) );

		return rest_ensure_response( array( 'success' => true ) );
	}

	public function delete_item( $request ) {
		global $wpdb;
		$user_id = get_current_user_id();
		$id = $request['id'];
		$table = $wpdb->prefix . 'med_edu_projects';

		// Should also delete associated topics and flashcards?
		// The user said: "آیا از حذف این پروژه و تمام مباحث آن اطمینان دارید؟"
		// Topics are CPTs, so we should delete them too.

		$wpdb->delete( $table, array( 'id' => $id, 'user_id' => $user_id ) );

		// Delete flashcards
		$wpdb->delete( $wpdb->prefix . 'med_edu_flashcards', array( 'project_id' => $id, 'user_id' => $user_id ) );

		return rest_ensure_response( array( 'success' => true ) );
	}
}

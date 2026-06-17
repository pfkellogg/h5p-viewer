<?php
/**
 * Plugin Name: H5P Viewer
 * Plugin URI:  https://developer.datavizplus.com/
 * Description: Role-gated H5P inspector that examines H5P content in the browser and displays content type, ID, questions, and answers (correct and incorrect). Supports nested interactions and multiple H5P on the same page. Configurable visibility by role.
 * Version:     1.0.1
 * Author:      Patrick Kellogg
 * License:     GPL-2.0+
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Bail if the toolkit module is already handling this.
if ( defined( 'DVP_H5PV_VERSION' ) ) {
	return;
}

define( 'DVP_H5PV_VERSION', '1.0.1' );

// ============================================================================
// Settings Page (standalone only — toolkit uses bootstrap.php)
// ============================================================================

add_action( 'admin_menu', 'dvp_h5pv_standalone_menu' );

function dvp_h5pv_standalone_menu() {
	add_options_page(
		'H5P Viewer Settings',
		'H5P Viewer',
		'manage_options',
		'dvp-h5p-viewer-settings',
		'dvp_h5pv_standalone_settings_page'
	);
}

function dvp_h5pv_standalone_settings_page() {
	if ( isset( $_POST['dvp_h5pv_nonce'] ) && wp_verify_nonce( $_POST['dvp_h5pv_nonce'], 'dvp_h5pv_save' ) ) {
		$roles = isset( $_POST['dvp_h5pv_roles'] ) ? array_map( 'sanitize_text_field', (array) $_POST['dvp_h5pv_roles'] ) : array( 'administrator' );
		update_option( 'dvp_h5pv_allowed_roles', $roles );
		echo '<div class="notice notice-success is-dismissible"><p>Settings saved.</p></div>';
	}
	dvp_h5pv_render_role_settings();
}

/**
 * Shared role settings UI used by both standalone and toolkit.
 */
function dvp_h5pv_render_role_settings() {
	$allowed = get_option( 'dvp_h5pv_allowed_roles', array( 'administrator' ) );
	if ( ! is_array( $allowed ) ) {
		$allowed = array( 'administrator' );
	}
	$all_roles     = wp_roles()->role_names;
	$danger_roles  = array( 'subscriber', 'customer' );
	$has_danger    = ! empty( array_intersect( $allowed, $danger_roles ) );
	?>
	<div class="wrap">
		<h1>H5P Viewer</h1>
		<div class="card" style="max-width:700px;">
			<h2>Visibility</h2>
			<p>Select which roles can see the H5P Viewer on the frontend. The viewer exposes H5P content structure, questions, and answers.</p>
			<form method="post">
				<?php wp_nonce_field( 'dvp_h5pv_save', 'dvp_h5pv_nonce' ); ?>
				<fieldset>
					<?php foreach ( $all_roles as $slug => $label ) :
						$checked    = in_array( $slug, $allowed, true );
						$is_danger  = in_array( $slug, $danger_roles, true );
					?>
						<label style="display:block;margin:4px 0;<?php echo $is_danger && $checked ? 'color:#d63638;font-weight:600;' : ''; ?>">
							<input type="checkbox" name="dvp_h5pv_roles[]" value="<?php echo esc_attr( $slug ); ?>" <?php checked( $checked ); ?>>
							<?php echo esc_html( $label ); ?>
							<?php if ( $is_danger ) : ?>
								<span style="color:#d63638;font-size:11px;"> &mdash; exposes answers to learners</span>
							<?php endif; ?>
						</label>
					<?php endforeach; ?>
				</fieldset>

				<?php if ( $has_danger ) : ?>
					<div style="margin:12px 0;padding:10px 14px;background:#fcf0f1;border:1px solid #d63638;border-radius:4px;">
						<strong style="color:#d63638;">&#9888; Danger Zone:</strong>
						<span style="color:#d63638;">A basic user role is selected. Learners will be able to see all H5P questions and correct answers on any page they visit.</span>
					</div>
				<?php endif; ?>

				<?php submit_button( 'Save Settings' ); ?>
			</form>
		</div>
	</div>
	<?php
}

/**
 * Check if the current user has one of the allowed roles.
 */
function dvp_h5pv_user_can_view() {
	if ( ! is_user_logged_in() ) {
		return false;
	}

	$allowed = get_option( 'dvp_h5pv_allowed_roles', array( 'administrator' ) );
	if ( ! is_array( $allowed ) || empty( $allowed ) ) {
		return dvp_h5pv_user_can_view();
	}

	$user = wp_get_current_user();
	return ! empty( array_intersect( $user->roles, $allowed ) );
}

class H5P_Viewer {

	public function __construct() {
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_assets' ) );
		add_action( 'wp_footer',          array( $this, 'render_panel_shell' ) );
		add_action( 'rest_api_init',      array( $this, 'register_rest_routes' ) );
	}

	/**
	 * Check if the viewer should load for the current user.
	 */
	private function should_load() {
		return dvp_h5pv_user_can_view();
	}

	public function enqueue_assets() {
		if ( ! $this->should_load() ) {
			return;
		}

		wp_enqueue_style(
			'h5p-viewer',
			plugin_dir_url( __FILE__ ) . 'css/h5p-viewer.css',
			array(),
			'1.0.0'
		);

		wp_enqueue_script(
			'h5p-viewer',
			plugin_dir_url( __FILE__ ) . 'js/h5p-viewer.js',
			array(),
			'1.0.0',
			true
		);

		wp_localize_script( 'h5p-viewer', 'H5PViewerConfig', array(
			'restUrl' => esc_url_raw( rest_url( 'h5p-viewer/v1' ) ),
			'nonce'   => wp_create_nonce( 'wp_rest' ),
			'pageId'  => get_the_ID(),
			'siteUrl' => get_site_url(),
		) );
	}

	public function render_panel_shell() {
		if ( ! $this->should_load() ) {
			return;
		}
		echo '<div id="h5p-viewer-root" aria-hidden="true"></div>' . "\n";
	}

	public function register_rest_routes() {
		register_rest_route( 'h5p-viewer/v1', '/content/(?P<id>\d+)', array(
			'methods'             => 'GET',
			'callback'            => array( $this, 'rest_get_content' ),
			'permission_callback' => function() {
				return dvp_h5pv_user_can_view();
			},
			'args' => array(
				'id' => array(
					'validate_callback' => function( $v ) { return is_numeric( $v ); },
				),
			),
		) );

		register_rest_route( 'h5p-viewer/v1', '/page-contents', array(
			'methods'             => 'GET',
			'callback'            => array( $this, 'rest_get_page_contents' ),
			'permission_callback' => function() {
				return dvp_h5pv_user_can_view();
			},
			'args' => array(
				'ids' => array(
					'required'          => true,
					'validate_callback' => function( $v ) {
						return preg_match( '/^[\d,]+$/', $v );
					},
				),
			),
		) );
	}

	/**
	 * Return DB-level metadata for a single H5P content ID.
	 */
	public function rest_get_content( WP_REST_Request $request ) {
		global $wpdb;

		$id  = absint( $request->get_param( 'id' ) );
		$row = $wpdb->get_row( $wpdb->prepare(
			"SELECT c.id, c.title, c.parameters, c.filtered,
			        l.machine_name, l.major_version, l.minor_version
			 FROM   {$wpdb->prefix}h5p_contents c
			 JOIN   {$wpdb->prefix}h5p_libraries l ON l.id = c.library_id
			 WHERE  c.id = %d",
			$id
		) );

		if ( ! $row ) {
			return new WP_Error( 'not_found', 'H5P content not found', array( 'status' => 404 ) );
		}

		// Find every WordPress post/page that embeds this H5P via shortcode or block.
		$usages = $this->find_content_usages( $id );

		return rest_ensure_response( array(
			'id'           => (int) $row->id,
			'title'        => $row->title,
			'library'      => $row->machine_name . ' ' . $row->major_version . '.' . $row->minor_version,
			'machine_name' => $row->machine_name,
			'parameters'   => $row->filtered ? $row->filtered : $row->parameters,
			'usages'       => $usages,
		) );
	}

	/**
	 * Batch endpoint: accepts comma-separated content IDs, returns all at once.
	 */
	public function rest_get_page_contents( WP_REST_Request $request ) {
		$raw_ids = $request->get_param( 'ids' );
		$ids     = array_filter( array_map( 'absint', explode( ',', $raw_ids ) ) );

		if ( empty( $ids ) ) {
			return rest_ensure_response( array() );
		}

		$results = array();
		foreach ( $ids as $id ) {
			$sub_request = new WP_REST_Request( 'GET', '/h5p-viewer/v1/content/' . $id );
			$sub_request->set_param( 'id', $id );
			$response = $this->rest_get_content( $sub_request );
			if ( ! is_wp_error( $response ) ) {
				$results[] = $response->get_data();
			}
		}

		return rest_ensure_response( $results );
	}

	/**
	 * Searches post content for `[h5p id="X"]` shortcodes and Gutenberg blocks
	 * that reference the given H5P content ID.
	 */
	private function find_content_usages( $content_id ) {
		global $wpdb;

		$usages = array();

		// Search shortcode pattern: [h5p id="X"] or [h5p id='X']
		$like    = '%h5p id=' . $content_id . '%';
		$like2   = '%"id":' . $content_id . '%'; // block JSON
		$like3   = '%"id": ' . $content_id . '%'; // block JSON with space

		$posts = $wpdb->get_results( $wpdb->prepare(
			"SELECT ID, post_title, post_type, post_status, guid
			 FROM   {$wpdb->posts}
			 WHERE  post_status IN ('publish','draft','private')
			   AND  ( post_content LIKE %s
			       OR post_content LIKE %s
			       OR post_content LIKE %s )",
			$like, $like2, $like3
		) );

		foreach ( $posts as $post ) {
			$usages[] = array(
				'post_id'    => (int) $post->ID,
				'post_title' => $post->post_title,
				'post_type'  => $post->post_type,
				'post_status'=> $post->post_status,
				'edit_url'   => get_edit_post_link( $post->ID, 'raw' ),
				'view_url'   => get_permalink( $post->ID ),
			);
		}

		return $usages;
	}
}

new H5P_Viewer();

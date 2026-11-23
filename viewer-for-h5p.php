<?php
/**
 * Plugin Name:       Viewer for H5P
 * Plugin URI:        https://aikellogg.com/#/viewer-for-h5p
 * Description:       A role-gated inspector for the H5P content on a page: its content type, ID, every question, and every answer (correct and incorrect), nested interactions included. For course builders and reviewers.
 * Version:           1.1.1
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Requires Plugins:  h5p
 * Author:            Patrick Kellogg
 * Author URI:        https://aikellogg.com
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       viewer-for-h5p
 *
 * H5P is a registered trademark of H5P Group. This plugin is not made or endorsed by H5P Group.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Bail if another copy (a toolkit that bundles this viewer) is already running.
if ( defined( 'DVP_H5PV_VERSION' ) ) {
	return;
}

define( 'DVP_H5PV_VERSION', '1.1.1' );
define( 'DVP_H5PV_URL', plugin_dir_url( __FILE__ ) );
define( 'DVP_H5PV_OPTION', 'dvp_h5pv_allowed_roles' );

/**
 * The roles allowed to see the viewer (administrators if the setting is missing or empty).
 *
 * @return string[]
 */
function dvp_h5pv_allowed_roles() {
	$allowed = get_option( DVP_H5PV_OPTION, array( 'administrator' ) );
	if ( ! is_array( $allowed ) || empty( $allowed ) ) {
		return array( 'administrator' );
	}
	return $allowed;
}

/**
 * Whether the current user may see the viewer: logged in, with one of the allowed roles.
 *
 * @return bool
 */
function dvp_h5pv_user_can_view() {
	if ( ! is_user_logged_in() ) {
		return false;
	}
	$user = wp_get_current_user();
	return ! empty( array_intersect( (array) $user->roles, dvp_h5pv_allowed_roles() ) );
}

// ============================================================================
// Settings: Settings > Viewer for H5P
// ============================================================================

add_action( 'admin_menu', 'dvp_h5pv_menu' );

function dvp_h5pv_menu() {
	add_options_page(
		__( 'Viewer for H5P', 'viewer-for-h5p' ),
		__( 'Viewer for H5P', 'viewer-for-h5p' ),
		'manage_options',
		'dvp-h5p-viewer-settings',
		'dvp_h5pv_settings_page'
	);
}

add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), 'dvp_h5pv_action_links' );

function dvp_h5pv_action_links( $links ) {
	$url = admin_url( 'options-general.php?page=dvp-h5p-viewer-settings' );
	array_unshift( $links, '<a href="' . esc_url( $url ) . '">' . esc_html__( 'Settings', 'viewer-for-h5p' ) . '</a>' );
	return $links;
}

function dvp_h5pv_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	if ( isset( $_POST['dvp_h5pv_nonce'] )
		&& wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['dvp_h5pv_nonce'] ) ), 'dvp_h5pv_save' ) ) {
		$posted = isset( $_POST['dvp_h5pv_roles'] )
			? array_map( 'sanitize_key', (array) wp_unslash( $_POST['dvp_h5pv_roles'] ) )
			: array();
		// Only roles that exist on this site; none chosen means administrators.
		$roles = array_values( array_intersect( $posted, array_keys( wp_roles()->role_names ) ) );
		if ( empty( $roles ) ) {
			$roles = array( 'administrator' );
		}
		update_option( DVP_H5PV_OPTION, $roles );
		echo '<div class="notice notice-success is-dismissible"><p>' . esc_html__( 'Settings saved.', 'viewer-for-h5p' ) . '</p></div>';
	}
	dvp_h5pv_render_role_settings();
}

/**
 * The role settings form.
 */
function dvp_h5pv_render_role_settings() {
	$allowed      = dvp_h5pv_allowed_roles();
	$all_roles    = wp_roles()->role_names;
	$danger_roles = array( 'subscriber', 'customer', 'student' );
	$has_danger   = ! empty( array_intersect( $allowed, $danger_roles ) );
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'Viewer for H5P', 'viewer-for-h5p' ); ?></h1>
		<div class="card" style="max-width:700px;">
			<h2><?php esc_html_e( 'Visibility', 'viewer-for-h5p' ); ?></h2>
			<p><?php esc_html_e( 'Choose which roles see the viewer on the front end. It shows the structure of the H5P content on a page, with its questions and answers.', 'viewer-for-h5p' ); ?></p>
			<form method="post">
				<?php wp_nonce_field( 'dvp_h5pv_save', 'dvp_h5pv_nonce' ); ?>
				<fieldset>
					<?php
					foreach ( $all_roles as $slug => $label ) :
						$checked   = in_array( $slug, $allowed, true );
						$is_danger = in_array( $slug, $danger_roles, true );
						?>
						<label style="display:block;margin:4px 0;<?php echo ( $is_danger && $checked ) ? 'color:#d63638;font-weight:600;' : ''; ?>">
							<input type="checkbox" name="dvp_h5pv_roles[]" value="<?php echo esc_attr( $slug ); ?>" <?php checked( $checked ); ?>>
							<?php echo esc_html( translate_user_role( $label ) ); ?>
							<?php if ( $is_danger ) : ?>
								<span style="color:#d63638;font-size:11px;"> &mdash; <?php esc_html_e( 'shows answers to learners', 'viewer-for-h5p' ); ?></span>
							<?php endif; ?>
						</label>
					<?php endforeach; ?>
				</fieldset>

				<?php if ( $has_danger ) : ?>
					<div style="margin:12px 0;padding:10px 14px;background:#fcf0f1;border:1px solid #d63638;border-radius:4px;">
						<strong style="color:#d63638;">&#9888; <?php esc_html_e( 'Careful:', 'viewer-for-h5p' ); ?></strong>
						<span style="color:#d63638;"><?php esc_html_e( 'A learner role is selected. Learners will see every H5P question and its correct answers on any page they visit.', 'viewer-for-h5p' ); ?></span>
					</div>
				<?php endif; ?>

				<?php submit_button( __( 'Save Settings', 'viewer-for-h5p' ) ); ?>
			</form>
		</div>
	</div>
	<?php
}

// ============================================================================
// The viewer: a button and panel on the front end, and the REST routes it reads
// ============================================================================

class Dvp_H5PV_Viewer {

	const REST_NS = 'viewer-for-h5p/v1';

	public function __construct() {
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_assets' ) );
		add_action( 'wp_footer', array( $this, 'render_panel_shell' ) );
		add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );
	}

	public function enqueue_assets() {
		if ( ! dvp_h5pv_user_can_view() ) {
			return;
		}
		wp_enqueue_style( 'viewer-for-h5p', DVP_H5PV_URL . 'css/viewer-for-h5p.css', array(), DVP_H5PV_VERSION );
		wp_enqueue_script( 'viewer-for-h5p', DVP_H5PV_URL . 'js/viewer-for-h5p.js', array(), DVP_H5PV_VERSION, true );
		wp_localize_script(
			'viewer-for-h5p',
			'H5PViewerConfig',
			array(
				'restUrl' => esc_url_raw( rest_url( self::REST_NS ) ),
				'nonce'   => wp_create_nonce( 'wp_rest' ),
				'pageId'  => get_the_ID(),
				'siteUrl' => get_site_url(),
				'i18n'    => array(
					'title' => __( 'Viewer for H5P', 'viewer-for-h5p' ),
					'empty' => __( 'No H5P content found on this page.', 'viewer-for-h5p' ),
				),
			)
		);
	}

	public function render_panel_shell() {
		if ( ! dvp_h5pv_user_can_view() ) {
			return;
		}
		echo '<div id="h5p-viewer-root" aria-hidden="true"></div>' . "\n";
	}

	public function register_rest_routes() {
		register_rest_route(
			self::REST_NS,
			'/content/(?P<id>\d+)',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'rest_get_content' ),
				'permission_callback' => 'dvp_h5pv_user_can_view',
				'args'                => array(
					'id' => array(
						'validate_callback' => function ( $v ) {
							return is_numeric( $v );
						},
						'sanitize_callback' => 'absint',
					),
				),
			)
		);
		register_rest_route(
			self::REST_NS,
			'/page-contents',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'rest_get_page_contents' ),
				'permission_callback' => 'dvp_h5pv_user_can_view',
				'args'                => array(
					'ids' => array(
						'required'          => true,
						'validate_callback' => function ( $v ) {
							return is_string( $v ) && preg_match( '/^[\d,]+$/', $v );
						},
					),
				),
			)
		);
	}

	/**
	 * One H5P content item's metadata, from the H5P plugin's own tables.
	 */
	private function content( $id ) {
		global $wpdb;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- the H5P plugin's own tables, read live for an inspector.
		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT c.id, c.title, c.parameters, c.filtered, l.name AS machine_name, l.major_version, l.minor_version
				 FROM {$wpdb->prefix}h5p_contents c
				 JOIN {$wpdb->prefix}h5p_libraries l ON l.id = c.library_id
				 WHERE c.id = %d",
				$id
			)
		);
		if ( ! $row ) {
			return null;
		}
		return array(
			'id'           => (int) $row->id,
			'title'        => $row->title,
			'library'      => $row->machine_name . ' ' . $row->major_version . '.' . $row->minor_version,
			'machine_name' => $row->machine_name,
			'parameters'   => $row->filtered ? $row->filtered : $row->parameters,
			'usages'       => $this->find_content_usages( (int) $row->id ),
		);
	}

	public function rest_get_content( WP_REST_Request $request ) {
		$data = $this->content( absint( $request->get_param( 'id' ) ) );
		if ( ! $data ) {
			return new WP_Error( 'not_found', __( 'H5P content not found.', 'viewer-for-h5p' ), array( 'status' => 404 ) );
		}
		return rest_ensure_response( $data );
	}

	/**
	 * Several items at once: ids=1,2,3.
	 */
	public function rest_get_page_contents( WP_REST_Request $request ) {
		$ids     = array_slice( array_unique( array_filter( array_map( 'absint', explode( ',', (string) $request->get_param( 'ids' ) ) ) ) ), 0, 100 );
		$results = array();
		foreach ( $ids as $id ) {
			$data = $this->content( $id );
			if ( $data ) {
				$results[] = $data;
			}
		}
		return rest_ensure_response( $results );
	}

	/**
	 * The posts that embed this H5P item: the [h5p id="X"] shortcode or the block (its "id" attribute).
	 */
	private function find_content_usages( $content_id ) {
		global $wpdb;
		$id   = (int) $content_id;
		$like = array(
			'%' . $wpdb->esc_like( 'h5p id="' . $id . '"' ) . '%',
			'%' . $wpdb->esc_like( "h5p id='" . $id . "'" ) . '%',
			'%' . $wpdb->esc_like( 'h5p id=' . $id ) . '%',
			'%' . $wpdb->esc_like( '"id":' . $id ) . '%',
			'%' . $wpdb->esc_like( '"id": ' . $id ) . '%',
		);
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- a live search of post content for an inspector.
		$posts = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT ID, post_title, post_type, post_status, post_content FROM {$wpdb->posts}
				 WHERE post_status IN ('publish','draft','private')
				   AND ( post_content LIKE %s OR post_content LIKE %s OR post_content LIKE %s OR post_content LIKE %s OR post_content LIKE %s )",
				$like[0],
				$like[1],
				$like[2],
				$like[3],
				$like[4]
			)
		);

		$usages = array();
		foreach ( $posts as $post ) {
			// LIKE also matches id=50 when looking for id=5: keep only exact ids.
			if ( ! preg_match( '/(h5p\s+id=["\']?' . $id . '(?![0-9])|"id":\s*' . $id . '(?![0-9]))/', $post->post_content ) ) {
				continue;
			}
			$usages[] = array(
				'post_id'     => (int) $post->ID,
				'post_title'  => $post->post_title,
				'post_type'   => $post->post_type,
				'post_status' => $post->post_status,
				'edit_url'    => get_edit_post_link( $post->ID, 'raw' ),
				'view_url'    => get_permalink( $post->ID ),
			);
		}
		return $usages;
	}
}

new Dvp_H5PV_Viewer();

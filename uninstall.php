<?php
/**
 * Viewer for H5P: removes its one setting when the plugin is deleted.
 */
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}
delete_option( 'dvp_h5pv_allowed_roles' );

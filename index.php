<?php
	// File Manager.
	// (C) 2020 CubicleSoft.  All Rights Reserved.

	require_once "support/str_basics.php";
	require_once "support/page_basics.php";

	Str::ProcessAllInput();

	require_once "config.php";

	$rootpath = str_replace("\\", "/", dirname(__FILE__));

	$bb_randpage = $config["token_secret"];
	$bb_rootname = "File Manager";

	$bb_usertoken = "";
	$bb_username = "";
	$admin_version = array(1, 0, 0);

	@session_start();

	// Allow developers to interface with a login system.
	if (file_exists($rootpath . "/index_hook.php"))  require_once $rootpath . "/index_hook.php";
	else if (!isset($_SESSION["fm_admin_logged_in"]))
	{
		if (isset($_REQUEST["password"]))
		{
			if ($config["password"] === false || !password_verify($_REQUEST["password"], $config["password"]))  BB_SetPageMessage("error", "Invalid password.  Reset hash:  " . password_hash($_REQUEST["password"], PASSWORD_DEFAULT));

			if (BB_GetPageMessageType() != "error")
			{
				$_SESSION["fm_admin_logged_in"] = true;

				header("Location: " . BB_GetFullRequestURLBase());

				exit();
			}
		}

		$contentopts = array(
			"desc" => "Enter login information.",
			"fields" => array(
				array(
					"title" => "Password",
					"type" => "password",
					"name" => "password",
					"default" => ""
				),
			),
			"submit" => "Login"
		);

		BB_GeneratePage("Login", array(), $contentopts);

		exit();
	}

	BB_ProcessPageToken("action");

	// Heartbeat.
	if (isset($_REQUEST["action"]) && $_REQUEST["action"] == "heartbeat")
	{
		$_SESSION["lastts"] = time();

		echo "OK";

		exit();
	}

	// Handle most File Explorer options via the helper class.
	require_once "support/file_explorer_fs_helper.php";
	require_once "support/file_upload_helper.php";

	$thumbsurl = BB_GetFullRequestURLBase();
	if (substr($thumbsurl, -1) === "/")  $thumbsurl = rtrim($thumbsurl, "/");
	else  $thumbsurl = dirname($thumbsurl);

	$options = array(
		"protect_depth" => 0,
		"recycle_to" => ($config["recycling"] ? BB_Translate("Recycle Bin") : false),
		"temp_dir" => str_replace("\\", "/", sys_get_temp_dir()),
		"dot_folders" => $config["dot_folders"],  // .git, .svn, .DS_Store
		"allowed_exts" => $config["file_exts"],
		"allow_empty_ext" => $config["allow_empty_ext"],
		"thumbs_dir" => $rootpath . "/thumbs",
		"thumbs_url" => $thumbsurl . "/thumbs",
		"thumb_create_url" => BB_GetFullRequestURLBase() . "?action=file_explorer_thumbnail&sec_t=" . BB_CreateSecurityToken("file_explorer_thumbnail"),
		"refresh" => true,
		"rename" => true,
		"file_info" => $config["tabbed"],
		"load_file" => $config["tabbed"],
		"save_file" => $config["tabbed"],
		"new_folder" => true,
		"new_file" => $config["new_file_ext"],
		"upload" => true,
		"upload_limit" => ($config["upload_limit"] < 0 ? -1 : Str::ConvertUserStrToBytes($config["upload_limit"])),  // -1 for unlimited or an integer
		"download" => ($bb_username !== "" ? $bb_username . "-" : "") . date("Y-m-d_H-i-s") . ".zip",
		"download_module" => "",  // Server handler for single-file downloads:  "" (none), "sendfile" (Apache), "accel-redirect" (Nginx)
		"download_module_prefix" => "",  // A string to prefix to the filename.  (For URI /protected access mapping for a Nginx X-Accel-Redirect to the system root)
		"copy" => true,
		"move" => true,
		"recycle" => $config["recycling"],
		"delete" => true
	);

	if ($config["projects_url"] != "")  $options["base_url"] = $config["projects_url"];

	// Allow modification of the options to be passed to the action helper.
	if (is_callable("ModifyFileExplorerOptions"))  call_user_func_array("ModifyFileExplorerOptions", array(&$options));

	FileExplorerFSHelper::HandleActions("action", "file_explorer_", $config["projects_path"], $options);


	// Main editing interface.
	header("Content-Type: text/html; charset=UTF-8");

	$acemodes = array();
	$acethemes = array();

	if ($config["tabbed"])
	{
		$dir = @opendir($rootpath . "/support/ace");
		if ($dir)
		{
			while (($file = readdir($dir)) !== false)
			{
				if (substr($file, -3) !== ".js")  continue;

				if (substr($file, 0, 5) === "mode-")  $acemodes[$file] = array("key" => "ace/mode/" . substr($file, 5, -3), "display" => substr($file, 5, -3));
				if (substr($file, 0, 6) === "theme-")  $acethemes[$file] = array("key" => "ace/theme/" . substr($file, 6, -3), "display" => substr($file, 6, -3));
			}

			closedir($dir);
		}

		ksort($acemodes, SORT_NATURAL | SORT_FLAG_CASE);
		ksort($acethemes, SORT_NATURAL | SORT_FLAG_CASE);

		$acemodes = array_values($acemodes);
		$acethemes = array_values($acethemes);
	}
?>
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<title><?=htmlspecialchars(BB_Translate("File Manager"))?></title>
<link rel="stylesheet" type="text/css" href="support/main.css">
<link rel="stylesheet" type="text/css" href="support/file-explorer/file-explorer.css">
<link rel="stylesheet" type="text/css" href="support/file-manager.css">
</head>
<body>
<div id="filemanager"></div>

<script type="text/javascript" src="support/file-explorer/file-explorer.js"></script>
<script type="text/javascript" src="support/flexforms/flex_forms.js"></script>
<?php
	if ($config["tabbed"])
	{
?>
<script type="text/javascript" src="support/ace/ace.js"></script>
<script type="text/javascript" src="support/flexforms/flex_forms_dialog.js"></script>
<?php
	}
?>
<script type="text/javascript" src="support/file-manager.js"></script>

<script type="text/javascript">
(function() {
	var elem = document.getElementById('filemanager');

	var xhrparammap = {
		'file_explorer_refresh': { sec_t: '<?=BB_CreateSecurityToken("file_explorer_refresh")?>' },
		'file_explorer_rename': { sec_t: '<?=BB_CreateSecurityToken("file_explorer_rename")?>' },
		'file_explorer_file_info': { sec_t: '<?=BB_CreateSecurityToken("file_explorer_file_info")?>' },
		'file_explorer_load_file': { sec_t: '<?=BB_CreateSecurityToken("file_explorer_load_file")?>' },
		'file_explorer_save_file': { sec_t: '<?=BB_CreateSecurityToken("file_explorer_save_file")?>' },
		'file_explorer_new_folder': { sec_t: '<?=BB_CreateSecurityToken("file_explorer_new_folder")?>' },
		'file_explorer_new_file': { sec_t: '<?=BB_CreateSecurityToken("file_explorer_new_file")?>' },
		'file_explorer_upload_init': { sec_t: '<?=BB_CreateSecurityToken("file_explorer_upload_init")?>' },
		'file_explorer_upload': { sec_t: '<?=BB_CreateSecurityToken("file_explorer_upload")?>' },
		'file_explorer_download': { sec_t: '<?=BB_CreateSecurityToken("file_explorer_download")?>' },
		'file_explorer_copy_init': { sec_t: '<?=BB_CreateSecurityToken("file_explorer_copy_init")?>' },
		'file_explorer_copy': { sec_t: '<?=BB_CreateSecurityToken("file_explorer_copy")?>' },
		'file_explorer_move': { sec_t: '<?=BB_CreateSecurityToken("file_explorer_move")?>' },
		'file_explorer_recycle': { sec_t: '<?=BB_CreateSecurityToken("file_explorer_recycle")?>' },
		'file_explorer_delete': { sec_t: '<?=BB_CreateSecurityToken("file_explorer_delete")?>' },
	};

	var options = {
		fe_uploadchunksize: <?=FileUploadHelper::GetMaxUploadFileSize()?>,

		ace_modes: <?=json_encode($acemodes, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT)?>,
		ace_themes: <?=json_encode($acethemes, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT)?>,

		recycling: <?=($config["recycling"] ? "true" : "false")?>,
		tabbed: <?=($config["tabbed"] ? "true" : "false")?>,

		onxhrparams: function(action, params) {
			if (xhrparammap[action])  Object.assign(params, xhrparammap[action]);
		}
	};

<?php
	// Allow modification of the 'xhrparammap' and 'options' objects.
	if (is_callable("ModifyFileManagerOptions"))  call_user_func("ModifyFileManagerOptions");
?>

	var fm = new window.FileManager(elem, options);

/*
	// Verify that there aren't any leaked globals.
	setTimeout(function() {
		// Create an iframe and put it in the <body>.
		var iframe = document.createElement('iframe');
		document.body.appendChild(iframe);

		// We'll use this to get a "pristine" window object.
		var pristineWindow = iframe.contentWindow.window;

		// Go through every property on `window` and filter it out if
		// the iframe's `window` also has it.
		console.log(Object.keys(window).filter(function(key) {
			return !pristineWindow.hasOwnProperty(key)
		}));

		// Remove the iframe.
		document.body.removeChild(iframe)
	}, 15000);
*/

<?php
	// Keep PHP sessions alive.
	if (session_status() === PHP_SESSION_ACTIVE)
	{
?>
	setInterval(function() {
		var xhr = new fm.PrepareXHR({
			url: '<?=BB_GetRequestURLBase()?>',
			params: {
				action: 'heartbeat',
				sec_t: '<?=BB_CreateSecurityToken("heartbeat")?>'
			}
		});

		xhr.Send();
	}, 5 * 60 * 1000);
<?php
	}
?>
})();
</script>

</body>
</html>

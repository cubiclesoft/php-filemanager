<?php
	// File Manager Installer.
	// (C) 2018 CubicleSoft.  All Rights Reserved.

	if (file_exists("config.php") && (!isset($_REQUEST["action"]) || $_REQUEST["action"] != "done"))  exit();

	require_once "support/str_basics.php";
	require_once "support/flex_forms.php";
	require_once "support/random.php";

	Str::ProcessAllInput();

	session_start();
	if (!isset($_SESSION["fm_admin_install"]))  $_SESSION["fm_admin_install"] = array();
	if (!isset($_SESSION["fm_admin_install"]["secret"]))
	{
		$rng = new CSPRNG();
		$_SESSION["fm_admin_install"]["secret"] = $rng->GetBytes(64);
	}

	$ff = new FlexForms();
	$ff->SetSecretKey($_SESSION["fm_admin_install"]["secret"]);
	$ff->CheckSecurityToken("action");

	function OutputHeader($title)
	{
		global $ff;

		header("Content-type: text/html; charset=UTF-8");

?>
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="x-ua-compatible" content="ie=edge">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title><?=htmlspecialchars($title)?> | File Manager Installer</title>
<link rel="stylesheet" href="support/install.css" type="text/css" media="all" />
<?php
		$ff->OutputJQuery();
?>
<script type="text/javascript">
setInterval(function() {
	$.post('<?=$ff->GetRequestURLBase()?>', {
		'action': 'heartbeat',
		'sec_t': '<?=$ff->CreateSecurityToken("heartbeat")?>'
	});
}, 5 * 60 * 1000);
</script>
</head>
<body>
<div id="headerwrap"><div id="header">File Manager Installer</div></div>
<div id="contentwrap"><div id="content">
<h1><?=htmlspecialchars($title)?></h1>
<?php
	}

	function OutputFooter()
	{
?>
</div></div>
<div id="footerwrap"><div id="footer">
&copy <?=date("Y")?> CubicleSoft.  All Rights Reserved.
</div></div>
</body>
</html>
<?php
	}

	$errors = array();
	if (isset($_REQUEST["action"]) && $_REQUEST["action"] == "heartbeat")
	{
		echo "OK";
	}
	else if (isset($_REQUEST["action"]) && $_REQUEST["action"] == "done")
	{
		if (!isset($_SESSION["fm_admin_installed"]) || !$_SESSION["fm_admin_installed"])  exit();

		OutputHeader("Installation Finished");

		$ff->OutputMessage("success", "The installation completed successfully.");

?>
<p>The File Manager was successfully installed.  You now have a powerful, easy to use file manager and code editor for creating HTML embeds.</p>

<p>What's next?  First, secure the directory where File Manager is installed.  Then <a href="<?=dirname($ff->GetRequestURLBase())?>/">start using File Manager</a>.</p>
<?php

		OutputFooter();
	}
	else if (isset($_REQUEST["action"]) && $_REQUEST["action"] == "step2")
	{
		if (!isset($_SESSION["fm_admin_install"]["projects_path"]))  $_SESSION["fm_admin_install"]["projects_path"] = $_SERVER["DOCUMENT_ROOT"] . "/projects";
		if (!isset($_SESSION["fm_admin_install"]["projects_url"]))  $_SESSION["fm_admin_install"]["projects_url"] = $ff->GetRequestHost() . "/projects";
		if (!isset($_SESSION["fm_admin_install"]["dot_folders"]))  $_SESSION["fm_admin_install"]["dot_folders"] = "No";
		if (!isset($_SESSION["fm_admin_install"]["file_exts"]))  $_SESSION["fm_admin_install"]["file_exts"] = ".jpg, .jpeg, .png, .gif, .svg, .html, .css, .js, .json, .md, .txt, .xml";
		if (!isset($_SESSION["fm_admin_install"]["allow_empty_ext"]))  $_SESSION["fm_admin_install"]["allow_empty_ext"] = "Yes";
		if (!isset($_SESSION["fm_admin_install"]["new_file_ext"]))  $_SESSION["fm_admin_install"]["new_file_ext"] = ".html";
		if (!isset($_SESSION["fm_admin_install"]["upload_limit"]))  $_SESSION["fm_admin_install"]["upload_limit"] = "20MB";
		if (!isset($_SESSION["fm_admin_install"]["recycling"]))  $_SESSION["fm_admin_install"]["recycling"] = "Yes";
		if (!isset($_SESSION["fm_admin_install"]["tabbed"]))  $_SESSION["fm_admin_install"]["tabbed"] = "Yes";
		if (!isset($_SESSION["fm_admin_install"]["password"]))  $_SESSION["fm_admin_install"]["password"] = "";

		$rng = new CSPRNG(true);
		$freqmap = json_decode(file_get_contents("support/en_us_lite.json"), true);

		$message = "";
		if (isset($_REQUEST["projects_path"]))
		{
			// Test settings.
			$html = "<html><head><title>Test</title></head><body>Test</body></html>";
			if (!is_dir($_REQUEST["projects_path"]))  $errors["projects_path"] = "The specified directory does not exist.  Please create the directory and make sure it is writeable by the web server (e.g. chown www-data, chmod 775).";
			else if (!@file_put_contents($_REQUEST["projects_path"] . "/test.html", $html))  $errors["projects_path"] = "The specified directory exists but is not writeable.  Please make sure the directory is writeable by the web server (e.g. chown www-data, chmod 775).";
			else if ($_REQUEST["projects_url"] != "")
			{
				require_once "support/web_browser.php";

				$web = new WebBrowser();

				$url = HTTP::ConvertRelativeToAbsoluteURL($ff->GetRequestHost("http"), $_REQUEST["projects_url"] . "/test.html");
				$result = $web->Process($url);
				if (!$result["success"])  $errors["projects_url"] = "Unable to connect to '" . htmlspecialchars($url) . "'.  " . $result["error"] . " (" . $result["errorcode"] . ")";
				else if ($result["response"]["code"] != 200)  $errors["projects_url"] = "Expected file was not found at '" . htmlspecialchars($url) . "'.  Expected 200 OK response.  Received '" . htmlspecialchars($result["response"]["line"]) . "'.";
				else if ($result["body"] != $html)  $errors["projects_url"] = "Expected file '" . htmlspecialchars($url) . "' did not contain expected data.";
				else  $message .= "Storage path and URL look okay.<br><b>Test URL was '" . htmlspecialchars($url) . "'.</b><br>";

				@unlink($_REQUEST["projects_path"] . "/test.html");
			}

			if (count($errors))  $errors["msg"] = "Please correct the errors below and try again.";
			else if (isset($_REQUEST["next"]))
			{
				$rootpath = str_replace("\\", "/", dirname(__FILE__));

				$config = array(
					"token_secret" => $rng->GenerateString(64),
					"projects_path" => $_REQUEST["projects_path"],
					"projects_url" => $_REQUEST["projects_url"],
					"dot_folders" => ($_REQUEST["dot_folders"] === "Yes"),
					"file_exts" => $_REQUEST["file_exts"],
					"allow_empty_ext" => ($_REQUEST["allow_empty_ext"] === "Yes"),
					"new_file_ext" => $_REQUEST["new_file_ext"],
					"upload_limit" => $_REQUEST["upload_limit"],
					"recycling" => ($_REQUEST["recycling"] === "Yes"),
					"tabbed" => ($_REQUEST["tabbed"] === "Yes"),
					"password" => ($_REQUEST["password"] !== "" ? password_hash($_REQUEST["password"], PASSWORD_DEFAULT) : false)
				);

				// Create the 'thumbs' cache directory.
				if (!count($errors))
				{
					if (!is_dir($rootpath . "/thumbs") && @mkdir($rootpath . "/thumbs", 0775) === false)  $errors["msg"] = "Unable to create 'thumbs' subdirectory.";
					else if (@file_put_contents($rootpath . "/thumbs/index.html", "") === false)  $errors["msg"] = "Unable to create the file '" . htmlspecialchars($rootpath . "/thumbs/index.html") . "'.";
				}

				// Set up a basic 'index_hook.php'.
				if (!count($errors))
				{
					if ($config["password"] === false)
					{
						$data = "<" . "?php\n";
						$data .= "\t// Replace this file with your own login system integration.\n";
						$data .= "\tif (\$_SERVER[\"REMOTE_ADDR\"] !== \"" . $_SERVER["REMOTE_ADDR"] . "\")  exit();\n";
						$data .= "?" . ">";

						$filename = $rootpath . "/index_hook.php";
						if (@file_put_contents($filename, $data) === false)  $errors["msg"] = "Unable to write login system hook file to '" . htmlspecialchars($filename) . "'.";
						else if (function_exists("opcache_invalidate"))  @opcache_invalidate($filename, true);
					}
				}

				// Write the configuration to disk.
				if (!count($errors))
				{
					$data = "<" . "?php\n";
					$data .= "\$config = " . var_export($config, true) . ";\n";
					$data .= "?" . ">";

					$filename = $rootpath . "/config.php";
					if (@file_put_contents($filename, $data) === false)  $errors["msg"] = "Unable to write configuration to '" . htmlspecialchars($filename) . "'.";
					else if (function_exists("opcache_invalidate"))  @opcache_invalidate($filename, true);
				}

				if (!count($errors))
				{
					$_SESSION["fm_admin_installed"] = true;

					header("Location: " . $ff->GetFullRequestURLBase() . "?action=done&sec_t=" . $ff->CreateSecurityToken("done"));

					exit();
				}
			}
		}

		OutputHeader("Step 2:  Configure Settings");

		if (count($errors))  $ff->OutputMessage("error", $errors["msg"]);
		else if ($message != "")  $ff->OutputMessage("info", $message);

		$contentopts = array(
			"fields" => array(
				array(
					"title" => "* File storage path",
					"type" => "text",
					"name" => "projects_path",
					"default" => $_SESSION["fm_admin_install"]["projects_path"],
					"desc" => "The exact physical path on the server where files (e.g. images) are to be stored.  The directory must exist and be writeable by the web server.  It is recommended to use a folder for file storage that is different from where this tool is stored to minimize potential security issues."
				),
				array(
					"title" => "File storage base URL",
					"type" => "text",
					"name" => "projects_url",
					"default" => $_SESSION["fm_admin_install"]["projects_url"],
					"desc" => "The exact base URL where the stored files can be accessed via a web browser at the file storage path above."
				),
				array(
					"title" => "Allow dot folders",
					"type" => "select",
					"name" => "dot_folders",
					"options" => array("Yes" => "Yes", "No" => "No"),
					"default" => $_SESSION["fm_admin_install"]["dot_folders"],
					"desc" => "Allows folders that begin with a dot to be created/named (e.g. .git, .svn, .DS_Store)."
				),
				array(
					"title" => "Allowed file extensions",
					"type" => "text",
					"name" => "file_exts",
					"default" => $_SESSION["fm_admin_install"]["file_exts"],
					"desc" => "A comma separated list of allowed file extensions.  The default allows standard web and text files.  Leave blank to allow all file extensions (not recommended)."
				),
				array(
					"title" => "Allow empty extensions",
					"type" => "select",
					"name" => "allow_empty_ext",
					"options" => array("Yes" => "Yes", "No" => "No"),
					"default" => $_SESSION["fm_admin_install"]["allow_empty_ext"],
					"desc" => "Allows files without a file extension to be created/named."
				),
				array(
					"title" => "New file extension",
					"type" => "text",
					"name" => "new_file_ext",
					"default" => $_SESSION["fm_admin_install"]["new_file_ext"],
					"desc" => "The file extension to use for new files.  Ideally in the list of allowed file extensions."
				),
				array(
					"title" => "Upload file size limit",
					"type" => "text",
					"name" => "upload_limit",
					"default" => $_SESSION["fm_admin_install"]["upload_limit"],
					"desc" => "The maximum file size to allow to be uploaded.  Use -1 for unlimited size."
				),
				array(
					"title" => "Use Recycling Bin",
					"type" => "select",
					"name" => "recycling",
					"options" => array("Yes" => "Yes", "No" => "No"),
					"default" => $_SESSION["fm_admin_install"]["recycling"],
					"desc" => "Files that are deleted or overwritten are first placed into a Recycling Bin folder.  Deleting items from the folder must be handled using an external script."
				),
				array(
					"title" => "Use Tabbed Editor/Viewer",
					"type" => "select",
					"name" => "tabbed",
					"options" => array("Yes" => "Yes", "No" => "No"),
					"default" => $_SESSION["fm_admin_install"]["tabbed"],
					"desc" => "Don't want/need the tabbed code editor/previewer?  Disabling the tabbed editor/viewer will make File Explorer fill the entire space.  Useful for iframe injection."
				),
				array(
					"title" => "Password",
					"type" => "text",
					"name" => "password",
					"default" => $_SESSION["fm_admin_install"]["password"],
					"htmldesc" => "Specifying a password will install a very basic login system.  If you wish to integrate your own login system right away (recommended), then just leave this field blank.  Even if a password is specified, a different login system can be easily integrated later.<br>Suggested password:  " . htmlspecialchars($rng->GenerateWordLite($freqmap, $rng->GetInt(4, 7)) . "-" . $rng->GenerateWordLite($freqmap, $rng->GetInt(4, 7)) . "-" . $rng->GenerateWordLite($freqmap, $rng->GetInt(4, 7)))
				),
			),
			"submit" => array("test" => "Test Settings", "next" => "Install")
		);

		$ff->Generate($contentopts, $errors);

		OutputFooter();
	}
	else if (isset($_REQUEST["action"]) && $_REQUEST["action"] == "step1")
	{
		if (isset($_REQUEST["submit"]))
		{
			header("Location: " . $ff->GetFullRequestURLBase() . "?action=step2&sec_t=" . $ff->CreateSecurityToken("step2"));

			exit();
		}

		OutputHeader("Step 1:  Environment Check");

		if ((double)phpversion() < 5.6)  $errors["phpversion"] = "The server is running PHP " . phpversion() . ".  The installation may succeed but the API will not function.  Running outdated versions of PHP poses a serious website security risk.  Please contact your system administrator to upgrade your PHP installation.";

		if (file_put_contents("test.dat", "a") === false)  $errors["createfiles"] = "Unable to create 'test.dat'.  Running chmod 777 on the directory may fix the problem.  You can change permissions back after installation.";
		else if (!unlink("test.dat"))  $errors["createfiles"] = "Unable to delete 'test.dat'.  Running chmod 777 on the directory may fix the problem.  You can change permissions back after installation.";

		if (mkdir("test") === false)  $errors["createdirectories"] = "Unable to create 'test'.  Running chmod 777 on the directory may fix the problem.  You can change permissions back after installation.";
		else if (!rmdir("test"))  $errors["createdirectories"] = "Unable to remove 'test'.  Running chmod 777 on the directory may fix the problem.  You can change permissions back after installation.";

		if (!isset($_SERVER["REQUEST_URI"]))  $errors["requesturi"] = "The server does not appear to support this feature.  The installation may fail and the software might not work.";

		if (!$ff->IsSSLRequest())  $errors["ssl"] = "The admin interface should be installed over SSL if used on public infrastructure.  SSL/TLS certificates can be obtained for free.  Proceed only if this major security risk is acceptable.";

		try
		{
			$rng = new CSPRNG(true);
		}
		catch (Exception $e)
		{
			$error["csprng"] = "Please ask your system administrator to install a supported PHP version (e.g. PHP 7 or later) or extension (e.g. OpenSSL).";
		}

?>
<p>The current PHP environment has been evaluated against the minimum system requirements.  Any issues found are noted below.  After correcting any issues, reload the page.</p>
<?php

		$contentopts = array(
			"fields" => array(
				array(
					"title" => "PHP 5.6.x or later",
					"type" => "static",
					"name" => "phpversion",
					"value" => (isset($errors["phpversion"]) ? "No.  Test failed." : "Yes.  Test passed.")
				),
				array(
					"title" => "Able to create files in ./",
					"type" => "static",
					"name" => "createfiles",
					"value" => (isset($errors["createfiles"]) ? "No.  Test failed." : "Yes.  Test passed.")
				),
				array(
					"title" => "Able to create directories in ./",
					"type" => "static",
					"name" => "createdirectories",
					"value" => (isset($errors["createdirectories"]) ? "No.  Test failed." : "Yes.  Test passed.")
				),
				array(
					"title" => "\$_SERVER[\"REQUEST_URI\"] supported",
					"type" => "static",
					"name" => "requesturi",
					"value" => (isset($errors["requesturi"]) ? "No.  Test failed." : "Yes.  Test passed.")
				),
				array(
					"title" => "Installation over SSL",
					"type" => "static",
					"name" => "ssl",
					"value" => (isset($errors["ssl"]) ? "No.  Test failed." : "Yes.  Test passed.")
				),
				array(
					"title" => "Crypto-safe CSPRNG available",
					"type" => "static",
					"name" => "csprng",
					"value" => (isset($errors["csprng"]) ? "No.  Test failed." : "Yes.  Test passed.")
				)
			),
			"submit" => "Next Step",
			"submitname" => "submit"
		);

		$functions = array(
			"json_encode" => "JSON encoding/decoding (critical!)"
		);

		foreach ($functions as $function => $info)
		{
			if (!function_exists($function))  $errors["function|" . $function] = "The software will be unable to use " . $info . ".  The installation might succeed but the product may not function at all.";

			$contentopts["fields"][] = array(
				"title" => "'" . $function . "' available",
				"type" => "static",
				"name" => "function|" . $function,
				"value" => (isset($errors["function|" . $function]) ? "No.  Test failed." : "Yes.  Test passed.")
			);
		}

		$extensions = array(
			"imagick" => "ImageMagick to scale/crop thumbnail images (if GD is available, this won't be a problem)",
			"gd" => "GD to scale/crop thumbnail images (if ImageMagick is available, this won't be a problem)"
		);

		foreach ($extensions as $extension => $info)
		{
			if (!extension_loaded($extension))  $errors["extension|" . $extension] = "The software will be unable to use " . $info . ".  The installation might succeed but the product may not function at all.";

			$contentopts["fields"][] = array(
				"title" => "'" . $extension . "' available",
				"type" => "static",
				"name" => "extension|" . $extension,
				"value" => (isset($errors["extension|" . $extension]) ? "No.  Test failed." : "Yes.  Test passed.")
			);
		}

		$ff->Generate($contentopts, $errors);

		OutputFooter();
	}
	else
	{
		OutputHeader("Introduction");

		foreach ($_GET as $key => $val)
		{
			if (!isset($_SESSION["fm_admin_install"][$key]))  $_SESSION["fm_admin_install"][$key] = (string)$val;
		}

?>
<p>You are about to install File Manager:  A powerful file manager and code editor for creating HTML embeds.</p>

<p><a href="<?=$ff->GetRequestURLBase()?>?action=step1&sec_t=<?=$ff->CreateSecurityToken("step1")?>">Start installation</a></p>
<?php

		OutputFooter();
	}
?>
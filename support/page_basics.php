<?php
	// Admin Pack server-side page manipulation functions.
	// (C) 2019 CubicleSoft.  All Rights Reserved.

	// Most functionality has been moved into FlexForms.  Much of this is legacy interface code for convenience and to avoid breaking things badly.
	require_once "flex_forms.php";
	if (file_exists(str_replace("\\", "/", dirname(__FILE__)) . "/flex_forms_extras.php"))  require_once str_replace("\\", "/", dirname(__FILE__)) . "/flex_forms_extras.php";

	class BB_FlexForms extends FlexForms
	{
		public function CreateSecurityToken($action, $extra = "")
		{
			global $bb_randpage, $bb_usertoken;

			$this->SetSecretKey($bb_randpage . ":" . $bb_usertoken);

			return parent::CreateSecurityToken($action, $extra);
		}
	}

	// Can be used to override default functionality with an extended class.  However, form handlers are generally a better solution.
	$bb_flexforms = new BB_FlexForms();

	// Code swiped from Barebones CMS support functions.
	function BB_JSSafe($data)
	{
		return FlexForms::JSSafe($data);
	}

	function BB_IsSSLRequest()
	{
		return FlexForms::IsSSLRequest();
	}

	// Returns 'http[s]://www.something.com[:port]' based on the current page request.
	function BB_GetRequestHost($protocol = "")
	{
		return FlexForms::GetRequestHost($protocol);
	}

	function BB_GetRequestURLBase()
	{
		return FlexForms::GetRequestURLBase();
	}

	function BB_GetFullRequestURLBase($protocol = "")
	{
		return FlexForms::GetFullRequestURLBase($protocol);
	}

	// Multilingual admin functions.
	function BB_Translate()
	{
		global $bb_admin_lang, $bb_admin_def_lang, $bb_langmap;

		$args = func_get_args();
		if (!count($args) || $args[0] == "")  return "";
		if (isset($bb_admin_lang) && isset($bb_admin_def_lang) && isset($bb_langmap))
		{
			$arg = $args[0];
			if (isset($bb_langmap[$bb_admin_lang]) && isset($bb_langmap[$bb_admin_lang][$arg]))  $args[0] = $bb_langmap[$bb_admin_lang][$arg];
			else if (isset($bb_langmap[$bb_admin_def_lang]) && isset($bb_langmap[$bb_admin_def_lang][$arg]))  $args[0] = $bb_langmap[$bb_admin_def_lang][$arg];
			else if (isset($bb_langmap[""][$arg]))  $args[0] = $bb_langmap[""][$arg];
			else if (function_exists("BB_Untranslated"))  BB_Untranslated($args);
		}
		if (count($args) == 1 && strpos($args[0], "%") !== false)  $args[0] = str_replace("%", "%%", $args[0]);

		return call_user_func_array("sprintf", $args);
	}

	function BB_PostTranslate($str)
	{
		global $bb_admin_lang, $bb_admin_def_lang, $bb_langmap;

		if (isset($bb_admin_lang) && isset($bb_admin_def_lang) && isset($bb_langmap))
		{
			if (isset($bb_langmap[$bb_admin_lang]) && isset($bb_langmap[$bb_admin_lang][""]) && is_array($bb_langmap[$bb_admin_lang][""]))  $str = str_replace($bb_langmap[$bb_admin_lang][""][0], $bb_langmap[$bb_admin_lang][""][1], $str);
			else if (isset($bb_langmap[$bb_admin_def_lang]) && isset($bb_langmap[$bb_admin_def_lang][""]) && is_array($bb_langmap[$bb_admin_def_lang][""]))  $str = str_replace($bb_langmap[$bb_admin_def_lang][""][0], $bb_langmap[$bb_admin_def_lang][""][1], $str);
			else if (isset($bb_langmap[""][""]) && is_array($bb_langmap[""][""]))  $str = str_replace($bb_langmap[""][""][0], $bb_langmap[""][""][1], $str);
		}

		return $str;
	}

	function BB_FormatTimestamp($format, $ts)
	{
		return BB_PostTranslate(date(BB_Translate($format), $ts));
	}

	function BB_SetLanguage($path, $lang)
	{
		global $bb_langmap, $bb_admin_lang;

		$lang = preg_replace('/\s+/', "_", trim(preg_replace('/[^a-z]/', " ", strtolower($lang))));
		if ($lang == "")
		{
			$path .= "default/";
		}
		else
		{
			if ($lang == "default")  return array("success" => false, "error" => "Invalid language.");
			$path .= $lang . "/";
		}

		if (isset($bb_langmap[$lang]))
		{
			if ($lang != "")  $bb_admin_lang = $lang;

			return array("success" => true);
		}
		$bb_langmap[$lang] = array();

		$dir = @opendir($path);
		if ($dir === false)  return array("success" => false, "error" => "Directory does not exist.", "info" => $path);

		while (($file = readdir($dir)) !== false)
		{
			if (strtolower(substr($file, -4)) == ".php")  require_once $path . $file;
		}

		closedir($dir);

		if (isset($bb_langmap[$lang][""]) && is_array($bb_langmap[$lang][""]))  $bb_langmap[$lang][""] = array(array_keys($bb_langmap[$lang][""]), array_values($bb_langmap[$lang][""]));

		$bb_admin_lang = $lang;

		return array("success" => true);
	}

	function BB_InitLangmap($path, $default = "")
	{
		global $bb_admin_lang, $bb_admin_def_lang, $bb_langmap;

		$bb_langmap = array();
		BB_SetLanguage($path, "");
		if ($default != "")  BB_SetLanguage($path, $default);
		if (isset($bb_admin_lang))  $bb_admin_def_lang = $bb_admin_lang;
		if (isset($_SERVER["HTTP_ACCEPT_LANGUAGE"]))
		{
			$langs = explode(",", $_SERVER["HTTP_ACCEPT_LANGUAGE"]);
			foreach ($langs as $lang)
			{
				$lang = trim($lang);
				$pos = strpos($lang, ";");
				if ($pos !== false)  $lang = substr($lang, 0, $pos);
				if ($lang != "")
				{
					$result = BB_SetLanguage($path, $lang);
					if ($result["success"])
					{
						if (!isset($bb_admin_def_lang) && isset($bb_admin_lang))  $bb_admin_def_lang = $bb_admin_lang;

						break;
					}
				}
			}
		}
	}

	// Route all translation requests through BB_Translate().
	if (!defined("CS_TRANSLATE_FUNC"))  define("CS_TRANSLATE_FUNC", "BB_Translate");


	// Code swiped from CubicleSoft browser cookie support functions.
	function SetCookieFixDomain($name, $value = "", $expires = 0, $path = "", $domain = "", $secure = false, $httponly = false)
	{
		if (!empty($domain))
		{
			// Remove port information.
			$pos = strpos($domain, "]");
			if (substr($domain, 0, 1) == "[" && $pos !== false)  $domain = substr($domain, 0, $pos + 1);
			else
			{
				$port = strpos($domain, ":");
				if ($port !== false)  $domain = substr($domain, 0, $port);

				// Fix the domain to accept domains with and without 'www.'.
				if (strtolower(substr($domain, 0, 4)) == "www.")  $domain = substr($domain, 4);
				if (strpos($domain, ".") === false)  $domain = "";
				else if (substr($domain, 0, 1) != ".")  $domain = "." . $domain;
			}
		}

		header("Set-Cookie: " . rawurlencode($name) . "=" . rawurlencode($value)
							. (empty($expires) ? "" : "; expires=" . gmdate("D, d-M-Y H:i:s", $expires) . " GMT")
							. (empty($path) ? "" : "; path=" . $path)
							. (empty($domain) ? "" : "; domain=" . $domain)
							. (!$secure ? "" : "; secure")
							. (!$httponly ? "" : "; HttpOnly"), false);
	}


	$bb_errors = array();

	function BB_RegisterPropertyFormHandler($mode, $callback)
	{
		FlexForms::RegisterFormHandler($mode, $callback);
	}

	// Originally from Barebones CMS editing routines.  Most functionality has now transitioned to FlexForms.
	function BB_PropertyForm($options)
	{
		global $bb_message_layout, $bb_formtables, $bb_formwidths, $bb_flexforms, $bb_errors;

		if (!isset($bb_formtables) || !is_bool($bb_formtables))  $bb_formtables = true;
		if (!isset($bb_formwidths) || !is_bool($bb_formwidths))  $bb_formwidths = true;

		// Certain types of fields require the Admin Pack extras package.
		if (defined("BB_ROOT_URL"))  $rooturl = BB_ROOT_URL;
		else if (defined("ROOT_URL"))  $rooturl = ROOT_URL;
		else
		{
			$rooturl = BB_GetRequestURLBase();
			if (substr($rooturl, -1) != "/")  $rooturl = str_replace("\\", "/", dirname($rooturl));
			if (substr($rooturl, -1) == "/")  $rooturl = substr($rooturl, 0, -1);
		}

		if (defined("BB_SUPPORT_PATH"))  $supportpath = BB_SUPPORT_PATH;
		else if (defined("SUPPORT_PATH"))  $supportpath = SUPPORT_PATH;
		else  $supportpath = "support";

		// Initialize the FlexForms class instance.  Override a few defaults for AdminPack template integration.
		$bb_flexforms->SetState(array("supporturl" => $rooturl . "/" . $supportpath, "formtables" => $bb_formtables, "formwidths" => $bb_formwidths, "jqueryuitheme" => "adminpack"));
		$bb_flexforms->SetJSOutput("jquery");
		$bb_flexforms->SetCSSOutput("formcss");

		// AdminPack provides its own security token logic and doesn't need stringent randomized field support.
		unset($options["hashnames"]);

?>
	<div class="proptitlewrap"><div class="proptitle"><span id="navbutton"><span class="navbuttonline"></span><span class="navbuttonline"></span><span class="navbuttonline"></span></span><span class="proptitletext"><?php echo htmlspecialchars(BB_Translate($options["title"])); ?></span></div></div>
<?php
		if (isset($_REQUEST["bb_msg"]))
		{
			if (!isset($_REQUEST["bb_msgtype"]) || ($_REQUEST["bb_msgtype"] != "error" && $_REQUEST["bb_msgtype"] != "success"))  $_REQUEST["bb_msgtype"] = "info";

			$data2 = str_replace("@MSGTYPE@", htmlspecialchars($_REQUEST["bb_msgtype"]), $bb_message_layout);
			$data2 = str_replace("@MESSAGE@", htmlspecialchars(BB_Translate($_REQUEST["bb_msg"])), $data2);

?>
	<div class="propmessagewrap propmessage<?php echo htmlspecialchars($_REQUEST["bb_msgtype"]); ?>"><div class="propmessage"><?php echo $data2; ?></div></div>
<?php
		}
?>
	<div class="propdescwrap"><div class="propdesc"><?php echo htmlspecialchars(BB_Translate($options["desc"])); ?><?php if (isset($options["htmldesc"]))  echo $options["htmldesc"]; ?></div></div>
	<div class="propmainwrap"><div class="propmain">
<?php
		$bb_flexforms->Generate($options, $bb_errors);
?>
	</div></div>
<?php
	}


	// Drop-in replacement for hash_hmac() on hosts where Hash is not available.
	// Only supports HMAC-MD5 and HMAC-SHA1.
	if (!function_exists("hash_hmac"))
	{
		function hash_hmac($algo, $data, $key, $raw_output = false)
		{
			$algo = strtolower($algo);
			$size = 64;
			$opad = str_repeat("\x5C", $size);
			$ipad = str_repeat("\x36", $size);

			if (strlen($key) > $size)  $key = $algo($key, true);
			$key = str_pad($key, $size, "\x00");

			$y = strlen($key) - 1;
			for ($x = 0; $x < $y; $x++)
			{
				$opad[$x] = $opad[$x] ^ $key[$x];
				$ipad[$x] = $ipad[$x] ^ $key[$x];
			}

			$result = $algo($opad . $algo($ipad . $data, true), $raw_output);

			return $result;
		}
	}

	// Function swiped from Barebones CMS edit.php.
	// Create a valid language-level security token (also known as a 'nonce').
	function BB_CreateSecurityToken($name, $extra = "")
	{
		global $bb_flexforms;

		return $bb_flexforms->CreateSecurityToken($name, $extra);
	}

	function BB_IsSecExtraOpt($opt)
	{
		global $bb_flexforms;

		return $bb_flexforms->IsSecExtraOpt($opt);
	}

	// Custom-built routines specifically for displaying the final page.
	function BB_ProcessPageToken($name)
	{
		global $bb_flexforms;

		return $bb_flexforms->CheckSecurityToken($name);
	}

	function BB_GetBackURL($query = array(), $fullrequest = false, $protocol = "")
	{
		return ($fullrequest ? BB_GetFullRequestURLBase($protocol) : BB_GetRequestURLBase()) . (count($query) ? "?" . implode("&", $query) : "");
	}

	function BB_RedirectPage($msgtype = "", $msg = "", $query = array())
	{
		if ($msgtype != "")
		{
			if (!isset($_REQUEST["bb_msgtype"]) || ($_REQUEST["bb_msgtype"] != "error" && $_REQUEST["bb_msgtype"] != "success" && $_REQUEST["bb_msgtype"] != "info"))  $_REQUEST["bb_msgtype"] = $msgtype;
			else if ($msgtype == "error")  $_REQUEST["bb_msgtype"] = "error";
			else if ($msgtype == "info" && $_REQUEST["bb_msgtype"] != "error")  $_REQUEST["bb_msgtype"] = "info";
			else  $_REQUEST["bb_msgtype"] = "success";

			if (!isset($_REQUEST["bb_msg"]))  $_REQUEST["bb_msg"] = $msg;
			else  $_REQUEST["bb_msg"] = $msg . "  " . $_REQUEST["bb_msg"];

			$query[] = "bb_msgtype=" . urlencode($_REQUEST["bb_msgtype"]);
			$query[] = "bb_msg=" . urlencode($_REQUEST["bb_msg"]);
		}

		header("Location: " . BB_GetBackURL($query, true));

		exit();
	}

	function BB_SetPageMessage($msgtype, $msg, $field = false)
	{
		global $bb_errors;

		if (!isset($_REQUEST["bb_msgtype"]) || $msgtype == "error" || ($msgtype == "info" && $_REQUEST["bb_msgtype"] != "error") || ($msgtype == "success" && $_REQUEST["bb_msgtype"] == "success"))
		{
			$_REQUEST["bb_msgtype"] = $msgtype;
			$_REQUEST["bb_msg"] = $msg;

			if ($msgtype == "error" && $field !== false)  $bb_errors[$field] = $msg;
		}
	}

	function BB_GetPageMessageType()
	{
		return (isset($_REQUEST["bb_msg"]) && isset($_REQUEST["bb_msgtype"]) ? ($_REQUEST["bb_msgtype"] == "error" || $_REQUEST["bb_msgtype"] == "success" ? $_REQUEST["bb_msgtype"] : "info") : "");
	}

	function BB_NormalizeFiles($key)
	{
		return FlexForms::NormalizeFiles($key);
	}

	function BB_GetValue($key, $default)
	{
		return FlexForms::GetValue($key, $default);
	}

	function BB_SelectValues($data)
	{
		return FlexForms::GetSelectValues($data);
	}

	function BB_ProcessInfoDefaults($info, $defaults)
	{
		return FlexForms::ProcessInfoDefaults($info, $defaults);
	}

	function BB_SetNestedPathValue(&$data, $pathparts, $val)
	{
		return FlexForms::SetNestedPathValue($data, $pathparts, $val);
	}

	function BB_GetIDDiff($origids, $newids)
	{
		return FlexForms::GetIDDiff($origids, $newids);
	}

	function BB_InitLayouts()
	{
		global $bb_page_layout, $bb_page_layout_no_menu, $bb_menu_layout, $bb_menu_item_layout, $bb_message_layout, $bb_page_layout_bulkedit;

		if (!isset($bb_page_layout))
		{
			ob_start();
?>
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<title>@TITLE@</title>
<link rel="stylesheet" href="@ROOTURL@/@SUPPORTPATH@/admin.css?20190329" type="text/css" media="all" />
<link rel="stylesheet" href="@ROOTURL@/@SUPPORTPATH@/admin_print.css?20190329" type="text/css" media="print" />
<script type="text/javascript" src="@ROOTURL@/@SUPPORTPATH@/jquery-3.5.0.min.js"></script>
<script type="text/javascript" src="@ROOTURL@/@SUPPORTPATH@/admin.js?20190329"></script>
<?php if (function_exists("BB_InjectLayoutHead"))  BB_InjectLayoutHead(); ?>
</head>
<body>
<div id="menuwrap">@MENU@</div>
<div id="contentwrap" tabindex="-1">@CONTENT@</div>
</body>
</html>
<?php
			$bb_page_layout = ob_get_contents();
			ob_end_clean();
		}

		if (!isset($bb_page_layout_no_menu))
		{
			ob_start();
?>
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<title>@TITLE@</title>
<link rel="stylesheet" href="@ROOTURL@/@SUPPORTPATH@/admin.css?20190329" type="text/css" media="all" />
<link rel="stylesheet" href="@ROOTURL@/@SUPPORTPATH@/admin_print.css?20190329" type="text/css" media="print" />
<script type="text/javascript" src="@ROOTURL@/@SUPPORTPATH@/jquery-3.5.0.min.js"></script>
<?php if (function_exists("BB_InjectLayoutHead"))  BB_InjectLayoutHead(); ?>
</head>
<body>
<div id="contentwrap" class="nomenu" tabindex="-1">@CONTENT@</div>
</body>
</html>
<?php
			$bb_page_layout_no_menu = ob_get_contents();
			ob_end_clean();
		}

		if (!isset($bb_menu_layout))
		{
			$bb_menu_layout = <<<EOF
<div class="menu">
	<div class="titlewrap"><span class="title">@TITLE@</span></div>
@ITEMS@
</div>
EOF;
		}

		if (!isset($bb_menu_item_layout))
		{
			$bb_menu_item_layout = <<<EOF
	<a @OPTS@>@NAME@</a>
EOF;
		}

		if (!isset($bb_message_layout))
		{
			$bb_message_layout = <<<EOF
<div class="message"><div class="@MSGTYPE@">@MESSAGE@</div></div>
EOF;
		}

		// Bulk edit layout.
		if (!isset($bb_page_layout_bulkedit))
		{
			ob_start();
?>
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<title>@TITLE@</title>
<link rel="stylesheet" href="@ROOTURL@/@SUPPORTPATH@/admin_bulkedit.css?20190329" type="text/css" media="all" />
<script type="text/javascript" src="@ROOTURL@/@SUPPORTPATH@/jquery-3.5.0.min.js"></script>
<script type="text/javascript" src="@ROOTURL@/@SUPPORTPATH@/admin_bulkedit.js?20190329"></script>
<?php if (function_exists("BB_InjectLayoutHead"))  BB_InjectLayoutHead(); ?>
</head>
<body>
<div id="sidebarwrap">@ITEMS@</div>
<div id="topbarwrap">@TOPBAR@</div>
<div id="maincontentwrap">@CONTENT@</div>
<div id="bottombarwrap">@BOTTOMBAR@</div>
<div id="ajaxhidden"></div>
@SCRIPTS@
</body>
</html>
<?php
			$bb_page_layout_bulkedit = ob_get_contents();
			ob_end_clean();
		}
	}

	function BB_GeneratePage($title, $menuopts, $contentopts)
	{
		global $bb_rootname, $bb_page_layout, $bb_page_layout_no_menu, $bb_menu_layout, $bb_menu_item_layout;

		if (!isset($contentopts["title"]))  $contentopts["title"] = $title;

		header("Content-Type: text/html; charset=UTF-8");

		BB_InitLayouts();

		// Process the header.
		if (defined("BB_ROOT_URL"))  $rooturl = BB_ROOT_URL;
		else if (defined("ROOT_URL"))  $rooturl = ROOT_URL;
		else
		{
			$rooturl = BB_GetRequestURLBase();
			if (substr($rooturl, -1) != "/")  $rooturl = str_replace("\\", "/", dirname($rooturl));
			if (substr($rooturl, -1) == "/")  $rooturl = substr($rooturl, 0, -1);
		}

		if (defined("BB_SUPPORT_PATH"))  $supportpath = BB_SUPPORT_PATH;
		else if (defined("SUPPORT_PATH"))  $supportpath = SUPPORT_PATH;
		else  $supportpath = "support";

		$data = str_replace("@ROOTURL@", htmlspecialchars($rooturl), (count($menuopts) ? $bb_page_layout : $bb_page_layout_no_menu));
		$data = str_replace("@SUPPORTPATH@", htmlspecialchars($supportpath), $data);

		// Process the title.
		$data = str_replace("@TITLE@", htmlspecialchars(BB_Translate(($bb_rootname != "" ? $bb_rootname . " | " : "") . $title)), $data);
		$data = str_replace("@ROOTNAME@", htmlspecialchars(BB_Translate($bb_rootname)), $data);

		// Old templates.
		$data = str_replace("@MESSAGE@", "", $data);

		// Process the menu.
		$data2 = "";
		foreach ($menuopts as $title => $items)
		{
			// Allows for injecting custom HTML into the menu.
			if (is_string($items))  $data2 .= $items;
			else
			{
				$data3 = "";
				foreach ($items as $name => $opts)
				{
					if (!is_array($opts))  $opts = array("href" => $opts);

					$data5 = array();
					foreach ($opts as $name2 => $val)
					{
						$data5[] = htmlspecialchars($name2) . "=\"" . htmlspecialchars($val) . "\"";
					}

					$data4 = str_replace("@OPTS@", implode(" ", $data5), $bb_menu_item_layout);

					$data3 .= str_replace("@NAME@", (substr($name, 0, 5) === "html:" ? BB_Translate(substr($name, 5)) : htmlspecialchars(BB_Translate($name))), $data4);
				}

				$data3 = str_replace("@ITEMS@", $data3, $bb_menu_layout);
				$data2 .= str_replace("@TITLE@", htmlspecialchars(BB_Translate($title)), $data3);
			}
		}
		$data = str_replace("@MENU@", $data2, $data);

		// Process and display the content.
		$pos = strpos($data, "@CONTENT@");
		echo substr($data, 0, $pos);
		BB_PropertyForm($contentopts);
		echo substr($data, $pos + 9);

		if (!isset($contentopts["exit"]) || $contentopts["exit"])  exit();
	}

	function BB_GenerateBulkEditPage($title, $contentopts)
	{
		global $bb_rootname, $bb_page_layout_bulkedit;

		if (!isset($contentopts["title"]))  $contentopts["title"] = $title;

		header("Content-Type: text/html; charset=UTF-8");

		BB_InitLayouts();

		// Process the header.
		if (defined("BB_ROOT_URL"))  $rooturl = BB_ROOT_URL;
		else if (defined("ROOT_URL"))  $rooturl = ROOT_URL;
		else
		{
			$rooturl = BB_GetRequestURLBase();
			if (substr($rooturl, -1) != "/")  $rooturl = str_replace("\\", "/", dirname($rooturl));
			if (substr($rooturl, -1) == "/")  $rooturl = substr($rooturl, 0, -1);
		}

		if (defined("BB_SUPPORT_PATH"))  $supportpath = BB_SUPPORT_PATH;
		else if (defined("SUPPORT_PATH"))  $supportpath = SUPPORT_PATH;
		else  $supportpath = "support";

		$data = str_replace("@ROOTURL@", htmlspecialchars($rooturl), $bb_page_layout_bulkedit);
		$data = str_replace("@SUPPORTPATH@", htmlspecialchars($supportpath), $data);

		// Process the title and message.
		$data = str_replace("@TITLE@", htmlspecialchars(BB_Translate(($bb_rootname != "" ? $bb_rootname . " | " : "") . $title)), $data);
		$data = str_replace("@ROOTNAME@", htmlspecialchars(BB_Translate($bb_rootname)), $data);

		// Process the top and bottom bars, initial content, and necessary Javascript.
		$data = str_replace("@TOPBAR@", (isset($contentopts["topbarhtml"]) ? $contentopts["topbarhtml"] : ""), $data);
		$data = str_replace("@BOTTOMBAR@", (isset($contentopts["bottombarhtml"]) ? $contentopts["bottombarhtml"] : ""), $data);
		$data = str_replace("@CONTENT@", (isset($contentopts["initialhtml"]) ? $contentopts["initialhtml"] : ""), $data);
		$data = str_replace("@SCRIPTS@", (isset($contentopts["javascript"]) ? $contentopts["javascript"] : ""), $data);

		// Process and display the items.
		$pos = strpos($data, "@ITEMS@");
		echo substr($data, 0, $pos);
		if (isset($contentopts["items_callback"]) && is_callable($contentopts["items_callback"]))  $contentopts["items"] = call_user_func($contentopts["items_callback"]);
		if (isset($contentopts["items"]))
		{
			$altrow = false;
			while (count($contentopts["items"]))
			{
				foreach ($contentopts["items"] as $item)
				{
					echo "<a href=\"#\"" . (isset($item["id"]) ? " id=\"" . htmlspecialchars($item["id"]) . "\"" : "") . " class=\"" . trim(($altrow ? "altrow" : "") . (isset($item["class"]) ? " " . htmlspecialchars($item["class"]) : "")) . "\" onclick=\"" . (isset($item["onclick"]) ? htmlspecialchars($item["onclick"]) . "; " : "") . "return BB_SelectSidebarItem(this);\">" . (isset($item["htmldisplay"]) ? $item["htmldisplay"] : htmlspecialchars($item["display"])) . "</a>\n";

					$altrow = !$altrow;
				}

				if (isset($contentopts["items_callback"]) && is_callable($contentopts["items_callback"]))  $contentopts["items"] = call_user_func($contentopts["items_callback"]);
				else  $contentopts["items"] = array();
			}
		}
		echo substr($data, $pos + 7);

		if (!isset($contentopts["exit"]) || $contentopts["exit"])  exit();
	}
?>
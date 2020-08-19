<?php
	// Admin Pack summary view/print layout with FlexForms extensions.
	// (C) 2017 CubicleSoft.  All Rights Reserved.

	class AdminPackViewPrint
	{
		// View media.
		public static function ViewMediaInit(&$state, &$options)
		{
			$state["viewprint_media"] = false;

			$state["customfieldtypes"]["viewmedia"] = true;
		}

		public static function ViewMediaFieldString(&$state, $num, &$field, $id)
		{
			if ($field == "endmedia" && $state["viewprint_media"])
			{
?>
			<div style="clear: both;"></div>
<?php

				$state["viewprint_media"] = false;
			}
		}

		public static function ViewMediaCustomFieldType(&$state, $num, &$field, $id)
		{
			if ($field["type"] == "viewmedia")
			{
?>
			<div class="mediawrap">
<?php
				if (isset($field["title"]))
				{
					if (is_string($field["title"]))
					{
?>
			<div class="mediaitemtitle"><?php echo htmlspecialchars(FlexForms::FFTranslate($field["title"])); ?></div>
<?php
					}
				}
				else if (isset($field["htmltitle"]))
				{
?>
			<div class="mediaitemtitle"><?php echo FlexForms::FFTranslate($field["htmltitle"]); ?></div>
<?php
				}

				echo $field["value"];

				if (isset($field["desc"]) && $field["desc"] != "")
				{
?>
			<div class="mediaitemdesc"><?php echo htmlspecialchars(FlexForms::FFTranslate($field["desc"])); ?></div>
<?php
				}
				else if (isset($field["htmldesc"]) && $field["htmldesc"] != "")
				{
?>
			<div class="mediaitemdesc"><?php echo $field["htmldesc"]; ?></div>
<?php
				}
?>
			</div>
<?php

				$state["viewprint_media"] = true;
			}
		}

		public static function ViewMediaCleanup(&$state)
		{
			if ($state["viewprint_media"])
			{
?>
			<div style="clear: both;"></div>
<?php

				$state["viewprint_media"] = false;
			}
		}


		// View table.
		public static function ViewTableFieldType(&$state, $num, &$field, $id)
		{
			if ($field["type"] == "viewtable" && isset($field["data"]) && is_array($field["data"]))
			{
				$compact = (!isset($field["compact"]) || $field["compact"]);
				$encode = (!isset($field["encode"]) || $field["encode"]);
				$keysuffix = (isset($field["keysuffix"]) ? $field["keysuffix"] : ":");

?>
			<table class="viewtable">
<?php
				foreach ($field["data"] as $key => $val)
				{
					if ($val != "" || !$compact)
					{
?>
				<tr><td class="datakey"><?php echo FlexForms::FFTranslate($key . $keysuffix); ?></td><td><?php echo ($encode ? str_replace("\n", "<br>\n", htmlspecialchars($val)) : $val); ?></td></tr>
<?php
					}
				}
?>
			</table>
<?php
			}
		}


		// View static.
		public static function ViewStaticFieldType(&$state, $num, &$field, $id)
		{
			if ($field["type"] == "viewstatic")
			{
				$encode = (!isset($field["encode"]) || $field["encode"]);

?>
			<div class="staticwrap"><?php echo ($encode ? str_replace("\n", "<br />\n", htmlspecialchars($field["value"])) : $field["value"]); ?></div>
<?php
			}
		}
	}


	// Register form handlers.
	if (is_callable("FlexForms::RegisterFormHandler"))
	{
		FlexForms::RegisterFormHandler("init", "AdminPackViewPrint::ViewMediaInit");
		FlexForms::RegisterFormHandler("field_string", "AdminPackViewPrint::ViewMediaFieldString");
		FlexForms::RegisterFormHandler("field_type", "AdminPackViewPrint::ViewMediaCustomFieldType");
		FlexForms::RegisterFormHandler("cleanup", "AdminPackViewPrint::ViewMediaCleanup");

		FlexForms::RegisterFormHandler("field_type", "AdminPackViewPrint::ViewTableFieldType");

		FlexForms::RegisterFormHandler("field_type", "AdminPackViewPrint::ViewStaticFieldType");
	}


	// Disable features.
	$bb_formtables = false;
	$bb_formwidths = false;


	// Main layout.
	ob_start();
?>
<!DOCTYPE html>
<html>
<head>
<title>@TITLE@</title>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<link rel="stylesheet" href="@ROOTURL@/@SUPPORTPATH@/admin_view.css" type="text/css" media="all" />
<link rel="stylesheet" href="@ROOTURL@/@SUPPORTPATH@/admin_view_print.css" type="text/css" media="print" />
<script type="text/javascript" src="@ROOTURL@/@SUPPORTPATH@/jquery-3.1.1.min.js"></script>
<?php if (function_exists("BB_InjectLayoutHead"))  BB_InjectLayoutHead(); ?>
</head>
<body>
<div class="pagewrap">
	<div class="headerwrap">@ROOTNAME@</div>
	<div class="contentwrap">
<div class="maincontent">
@CONTENT@
</div>
	</div>
	<div class="menuwrap">@MENU@</div>
</div>
</body>
</html>
<?php
	$bb_page_layout = ob_get_contents();
	ob_end_clean();

	$bb_page_layout_no_menu = str_replace('<div class="menuwrap">@MENU@</div>', "", $bb_page_layout);
?>
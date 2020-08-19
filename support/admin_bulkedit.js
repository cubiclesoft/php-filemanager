function BB_UpdateLayout() {
	var barheight = 0;
	var topbar = $('#topbarwrap');
	if (!topbar.children().length)  topbar.hide();
	else
	{
		topbar.show();
		barheight += topbar.outerHeight();
	}

	var bottombar = $('#bottombarwrap');
	if (!bottombar.children().length)  $('#bottombarwrap').hide();
	else
	{
		bottombar.show();
		barheight += bottombar.outerHeight();
	}

	$('#maincontentwrap').outerHeight($(window).height() - barheight);
}

function BB_StripeSidebar() {
	$('#sidebarwrap a').removeClass('altrow').filter(':visible:odd').addClass('altrow');
}

function BB_SelectSidebarItem(obj) {
	$('#sidebarwrap a').removeClass('selected');
	$(obj).addClass('selected');

	return false;
}

$(function() {
	BB_StripeSidebar();
	BB_UpdateLayout();

	$(window).on('resize', BB_UpdateLayout);
});